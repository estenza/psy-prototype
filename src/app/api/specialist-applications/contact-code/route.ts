import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendOTPEmail } from "@/features/auth/lib/auth-email";
import {
  createOtpCode,
  deleteExpiredOtpCodes,
  findActiveOtpCode,
  incrementOtpAttempts,
  markOtpCodeAsUsed,
} from "@/features/auth/lib/auth-repository";
import {
  buildOtpExpiresAt,
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
} from "@/features/auth/lib/otp";
import { EMAIL_PATTERN } from "@/features/auth/constants";
import type { AuthErrorResponse, AuthMessageResponse } from "@/features/auth/types";

export const runtime = "nodejs";

function jsonError(message: string, status: number, fieldErrors?: AuthErrorResponse["fieldErrors"]) {
  return NextResponse.json<AuthErrorResponse>(
    {
      error: message,
      fieldErrors,
    },
    {
      status,
    },
  );
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      checkOnly?: boolean;
      code?: string;
      email?: string;
    };
    const email = normalizeEmail(payload.email);

    if (!EMAIL_PATTERN.test(email)) {
      return jsonError("Укажите корректный email.", 400, {
        email: "Укажите корректный email.",
      });
    }

    if (payload.checkOnly) {
      return NextResponse.json<AuthMessageResponse>({
        ok: true,
        message: "Email можно использовать для заявки.",
      });
    }

    await deleteExpiredOtpCodes();

    const code = payload.code?.trim() ?? "";

    if (!code) {
      const nextCode = generateOtpCode();
      const emailResult = await sendOTPEmail({
        code: nextCode,
        purpose: "sign-up",
        toEmail: email,
      });

      await createOtpCode({
        id: randomUUID(),
        email,
        codeHash: hashOtpCode(nextCode),
        purpose: "sign-up",
        expiresAt: buildOtpExpiresAt(),
      });

      return NextResponse.json<AuthMessageResponse>({
        ok: true,
        message: "Код отправлен.",
        debugOtpCode: emailResult.debugOtpCode,
      });
    }

    if (code.length !== 6) {
      return jsonError("Введите шестизначный код.", 400);
    }

    const otpRecord = await findActiveOtpCode(email, "sign-up");

    if (!otpRecord) {
      return jsonError("Код недействителен или устарел. Запросите новый.", 401);
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return jsonError("Превышен лимит попыток. Запросите новый код.", 429);
    }

    if (hashOtpCode(code) !== otpRecord.code_hash) {
      await incrementOtpAttempts(otpRecord.id);
      const attemptsLeft = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1;

      return jsonError(
        attemptsLeft > 0
          ? `Неверный код. Осталось попыток: ${attemptsLeft}.`
          : "Неверный код. Запросите новый.",
        401,
      );
    }

    await markOtpCodeAsUsed(otpRecord.id);

    return NextResponse.json<AuthMessageResponse>({
      ok: true,
      message: "Email подтвержден.",
    });
  } catch (error) {
    console.error("[api/specialist-applications/contact-code]", error);
    return jsonError("Не удалось обработать код подтверждения.", 500);
  }
}
