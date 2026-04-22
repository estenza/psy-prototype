import "server-only";

import { createHash, randomInt } from "node:crypto";

export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_SECONDS = 15 * 60;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpPurpose = "sign-in" | "sign-up";

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_CODE_LENGTH, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function buildOtpExpiresAt(): string {
  return new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();
}
