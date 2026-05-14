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

    if (existingUser?.role === "specialist" && existingUser.specialistStatus !== "verified") {
      throw new AuthServiceError({
        message: existingUser.specialistStatus === "pending"
          ? "Заявка психолога пока на проверке. Мы пришлем письмо с итогом на указанный email."
          : "Вход для этого email психолога сейчас недоступен.",
        status: 403,
        fieldErrors: {
          email: "Этот email пока не подтвержден для входа психолога.",
        },
      });
    }

    await deleteExpiredOtpCodes();

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = buildOtpExpiresAt();
    const resolvedPurpose: OtpPurpose = "sign-in";

    await createOtpCode({
      id: randomUUID(),
      email,
      codeHash,
      purpose: resolvedPurpose,
      expiresAt,
    });

    const emailResult = await sendOTPEmail({
      adminContext: Boolean(adminContext),
      code,
      purpose: resolvedPurpose,
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
