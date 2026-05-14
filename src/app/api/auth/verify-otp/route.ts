import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import {
  AuthServiceError,
  buildDefaultUserDisplayName,
  buildDefaultUserNickname,
  ensureUserProfileIdentity,
} from "@/features/auth/lib/auth-service";
import {
  createUser,
  findActiveOtpCode,
  findUserByEmail,
  incrementOtpAttempts,
  markOtpCodeAsUsed,
} from "@/features/auth/lib/auth-repository";
import {
  setSessionCookie,
} from "@/features/auth/lib/session";
import { syncBootstrapModeratorGrant } from "@/features/auth/lib/bootstrap-moderator";
import { isBootstrapModeratorEmail } from "@/features/auth/lib/bootstrap-moderator";
import { createSessionForUser } from "@/features/auth/lib/session-creation";
import { hashOtpCode, OTP_MAX_ATTEMPTS, type OtpPurpose } from "@/features/auth/lib/otp";
import { EMAIL_PATTERN } from "@/features/auth/constants";
import type { AuthSuccessResponse } from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, code, purpose } = (await request.json()) as {
      email: string;
      code: string;
      purpose: OtpPurpose;
    };

    const email = rawEmail?.trim().toLowerCase() ?? "";
    const trimmedCode = code?.trim() ?? "";

    if (!EMAIL_PATTERN.test(email) || !trimmedCode || trimmedCode.length !== 6) {
      throw new AuthServiceError({ message: "Некорректный запрос.", status: 400 });
    }

    if (purpose !== "sign-in" && purpose !== "sign-up") {
      throw new AuthServiceError({ message: "Некорректный запрос.", status: 400 });
    }

    const otpRecord = await findActiveOtpCode(email, "sign-in");

    if (!otpRecord) {
      throw new AuthServiceError({
        message: "Код недействителен или устарел. Запросите новый.",
        status: 401,
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthServiceError({
        message: "Превышен лимит попыток. Запросите новый код.",
        status: 429,
      });
    }

    const codeHash = hashOtpCode(trimmedCode);

    if (codeHash !== otpRecord.code_hash) {
      await incrementOtpAttempts(otpRecord.id);
      const attemptsLeft = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1;
      throw new AuthServiceError({
        message: attemptsLeft > 0
          ? `Неверный код. Осталось попыток: ${attemptsLeft}.`
          : "Неверный код. Запросите новый.",
        status: 401,
      });
    }

    await markOtpCodeAsUsed(otpRecord.id);

    let user;

    user = await findUserByEmail(email);

    if (user?.isBanned) {
      throw new AuthServiceError({
        message: "Аккаунт заблокирован.",
        status: 403,
      });
    }

    if (user?.role === "specialist" && user.specialistStatus !== "verified") {
      throw new AuthServiceError({
        message: user.specialistStatus === "pending"
          ? "Заявка психолога пока на проверке. Мы пришлем письмо с итогом на указанный email."
          : "Вход для этого email психолога сейчас недоступен.",
        status: 403,
      });
    }

    if (!user) {
      user = await createUser({
        displayName: await buildDefaultUserDisplayName(),
        email,
        isModerator: isBootstrapModeratorEmail(email),
        nickname: await buildDefaultUserNickname(email),
        onboardingStep: "user-profile",
        passwordHash: "otp-only",
        role: "user",
      });

      if (!user) {
        throw new AuthServiceError({
          message: "Не удалось войти. Попробуйте ещё раз.",
          status: 500,
        });
      }
    }

    const resolvedUser = await syncBootstrapModeratorGrant(await ensureUserProfileIdentity(user));
    const session = await createSessionForUser(resolvedUser.id);

    const response = NextResponse.json<AuthSuccessResponse>({
      ok: true,
      user: resolvedUser,
    });

    setSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
