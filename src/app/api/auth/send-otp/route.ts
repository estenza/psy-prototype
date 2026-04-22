import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { sendOTPEmail } from "@/features/auth/lib/auth-email";
import { AuthServiceError } from "@/features/auth/lib/auth-service";
import type { AuthMessageResponse } from "@/features/auth/types";
import {
  createOtpCode,
  deleteExpiredOtpCodes,
  findUserByEmail,
} from "@/features/auth/lib/auth-repository";
import {
  buildOtpExpiresAt,
  generateOtpCode,
  hashOtpCode,
  type OtpPurpose,
} from "@/features/auth/lib/otp";
import { EMAIL_PATTERN } from "@/features/auth/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { adminContext, email: rawEmail, purpose } = (await request.json()) as {
      adminContext?: boolean;
      email: string;
      purpose: OtpPurpose;
    };

    const email = rawEmail?.trim().toLowerCase() ?? "";

    if (!EMAIL_PATTERN.test(email)) {
      throw new AuthServiceError({
        message: "Укажите корректный email.",
        status: 400,
        fieldErrors: { email: "Укажите корректный email." },
      });
    }

    if (purpose !== "sign-in" && purpose !== "sign-up") {
      throw new AuthServiceError({ message: "Некорректный запрос.", status: 400 });
    }

    const existingUser = await findUserByEmail(email);

    if (purpose === "sign-in" && !existingUser) {
      throw new AuthServiceError({
        message: "Аккаунт с таким email не найден.",
        status: 404,
        fieldErrors: { email: "Аккаунт с таким email не найден." },
      });
    }

    if (purpose === "sign-up" && existingUser) {
      throw new AuthServiceError({
        message: "Этот email уже используется.",
        status: 409,
        fieldErrors: { email: "Этот email уже занят. Войдите в аккаунт." },
      });
    }

    await deleteExpiredOtpCodes();

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = buildOtpExpiresAt();

    await createOtpCode({
      id: randomUUID(),
      email,
      codeHash,
      purpose,
      expiresAt,
    });

    const emailResult = await sendOTPEmail({
      adminContext: Boolean(adminContext),
      code,
      purpose,
      toEmail: email,
    });

    return NextResponse.json<AuthMessageResponse>({
      ok: true,
      message: "Код отправлен.",
      debugOtpCode: emailResult.debugOtpCode,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
