import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from "@/features/auth/constants";
import { buildPublicAppUrl } from "@/lib/app-url";

export function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetExpiresAt() {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000).toISOString();
}

export function buildAuthAppUrl(origin?: string) {
  return buildPublicAppUrl(origin);
}

export function buildPasswordResetUrl({
  origin,
  token,
}: {
  origin?: string;
  token: string;
}) {
  const url = new URL("/reset-password", buildAuthAppUrl(origin));
  url.searchParams.set("token", token);
  return url.toString();
}
