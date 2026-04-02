import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from "@/features/auth/constants";

const DEFAULT_PRODUCTION_APP_URL = "https://vnutri.live";
const DEFAULT_DEVELOPMENT_APP_URL = "http://localhost:3000";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

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
  const explicitAppUrl = process.env.AUTH_APP_URL?.trim();

  if (explicitAppUrl) {
    return trimTrailingSlash(explicitAppUrl);
  }

  if (origin?.trim()) {
    return trimTrailingSlash(origin.trim());
  }

  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_APP_URL
    : DEFAULT_DEVELOPMENT_APP_URL;
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
