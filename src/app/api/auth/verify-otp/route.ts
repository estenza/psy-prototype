import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { AuthServiceError } from "@/features/auth/lib/auth-service";
import {
  createUser,
  findActiveOtpCode,
  findUserByEmail,
  incrementOtpAttempts,
  markOtpCodeAsUsed,
} from "@/features/auth/lib/auth-repository";
import {
  buildSessionExpiresAt,
  generateSessionToken,
  hashSessionToken,
  setSessionCookie,
} from "@/features/auth/lib/session";
import { createSession, deleteExpiredSessions } from "@/features/auth/lib/auth-repository";
import { syncBootstrapModeratorGrant } from "@/features/auth/lib/bootstrap-moderator";
import { isBootstrapModeratorEmail } from "@/features/auth/lib/bootstrap-moderator";
import { buildDisplayName } from "@/features/auth/lib/profile";
import { hashOtpCode, OTP_MAX_ATTEMPTS, type OtpPurpose } from "@/features/auth/lib/otp";
import { EMAIL_PATTERN } from "@/features/auth/constants";
import type { AuthSuccessResponse } from "@/features/auth/types";

export const runtime = "nodejs";

async function createSessionForUser(userId: string) {
  await deleteExpiredSessions();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiresAt();

  await createSession({ expiresAt, tokenHash, userId });

  return { token, expiresAt };
}

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

    const otpRecord = await findActiveOtpCode(email, purpose);

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

    if (purpose === "sign-in") {
      user = await findUserByEmail(email);

      if (!user) {
        throw new AuthServiceError({
          message: "Аккаунт не найден.",
          status: 404,
        });
      }

      if (user.isBanned) {
        throw new AuthServiceError({
          message: "Аккаунт заблокирован.",
          status: 403,
        });
      }
    } else {
      const existingUser = await findUserByEmail(email);

      if (existingUser) {
        throw new AuthServiceError({
          message: "Этот email уже используется.",
          status: 409,
        });
      }

      const newUser = await createUser({
        displayName: buildDisplayName({ email, role: "user" }),
        email,
        isModerator: isBootstrapModeratorEmail(email),
        onboardingStep: "role",
        passwordHash: "otp-only",
        role: "user",
      });

      if (!newUser) {
        throw new AuthServiceError({
          message: "Не удалось создать аккаунт.",
          status: 500,
        });
      }

      user = newUser;
    }

    const resolvedUser = await syncBootstrapModeratorGrant(user);
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
