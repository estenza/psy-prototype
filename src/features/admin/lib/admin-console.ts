import type { NextResponse } from "next/server";
import type { SessionUser } from "@/features/auth/types";

export const ADMIN_ACCESS_KEY_COOKIE_NAME = "admin-access-key";

let hasValidatedAdminConfig = false;

function validateAdminConfig() {
  if (hasValidatedAdminConfig) {
    return;
  }

  hasValidatedAdminConfig = true;

  if (!process.env.ADMIN_APP_HOST?.trim() && !process.env.ADMIN_APP_URL?.trim()) {
    console.warn(
      "[admin-console] ADMIN_APP_HOST/ADMIN_APP_URL is not set. Admin console is disabled.",
    );
  }
}

export function normalizeHost(value: string | null | undefined) {
  const normalizedValue = value
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.replace(/:\d+$/, "");
}

function parseHostFromUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

export function getAdminConsoleHost() {
  validateAdminConfig();

  // Админ-контур доступен только при явной настройке домена/URL через env.
  // Умышленно не используем предсказуемый дефолтный хост.
  const explicitHost = normalizeHost(process.env.ADMIN_APP_HOST);

  if (explicitHost) {
    return explicitHost;
  }

  const hostFromUrl = normalizeHost(parseHostFromUrl(process.env.ADMIN_APP_URL));

  return hostFromUrl;
}

export function isAdminConsoleHost(host: string | null | undefined) {
  const normalizedHost = normalizeHost(host);

  return Boolean(normalizedHost && normalizedHost === getAdminConsoleHost());
}

export function getConfiguredAdminAccessKey() {
  const value = process.env.ADMIN_ACCESS_KEY?.trim();

  return value || null;
}

function getAdminAccessKeyCookieConfig() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function resolveAdminAccessKey({
  bodyValue,
  cookieValue,
  headerValue,
}: {
  bodyValue?: string | null;
  cookieValue?: string | null;
  headerValue?: string | null;
}) {
  const resolvedValue = headerValue?.trim() || bodyValue?.trim() || cookieValue?.trim();

  return resolvedValue || null;
}

export function isValidAdminAccessKey(value: string | null | undefined) {
  const configuredKey = getConfiguredAdminAccessKey();

  if (!configuredKey) {
    return true;
  }

  return value?.trim() === configuredKey;
}

export function setAdminAccessKeyCookie(response: NextResponse, value: string) {
  response.cookies.set(
    ADMIN_ACCESS_KEY_COOKIE_NAME,
    value.trim(),
    getAdminAccessKeyCookieConfig(),
  );
}

export function clearAdminAccessKeyCookie(response: NextResponse) {
  response.cookies.set(ADMIN_ACCESS_KEY_COOKIE_NAME, "", {
    ...getAdminAccessKeyCookieConfig(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export function getAdminConsoleAllowedEmails() {
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS;

  if (!allowedEmails?.trim()) {
    return new Set<string>();
  }

  return new Set(
    allowedEmails
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminConsoleEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return getAdminConsoleAllowedEmails().has(normalizedEmail);
}

export function canAccessAdminConsole(
  user:
    | Pick<SessionUser, "email" | "isModerator">
    | null
    | undefined,
) {
  return Boolean(user?.isModerator && isAdminConsoleEmail(user.email));
}
