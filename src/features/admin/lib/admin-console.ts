import type { NextResponse } from "next/server";
import type { SessionUser } from "@/features/auth/types";

export const ADMIN_ACCESS_KEY_COOKIE_NAME = "admin-access-key";
const DEFAULT_ADMIN_ACCESS_PROOF_TTL_SECONDS = 60 * 60;

let hasValidatedAdminConfig = false;

function validateAdminConfig() {
  if (hasValidatedAdminConfig) {
    return;
  }

  hasValidatedAdminConfig = true;

  if (
    process.env.NODE_ENV === "production"
    && !process.env.ADMIN_APP_HOST?.trim()
    && !process.env.ADMIN_APP_URL?.trim()
  ) {
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

  if (hostFromUrl) {
    return hostFromUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return "admin.localhost";
  }

  return null;
}

export function isAdminConsoleHost(host: string | null | undefined) {
  const normalizedHost = normalizeHost(host);

  return Boolean(normalizedHost && normalizedHost === getAdminConsoleHost());
}

export function getConfiguredAdminAccessKey() {
  const value = process.env.ADMIN_ACCESS_KEY?.trim();

  return value || null;
}

function toPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAdminAccessProofTtlSeconds() {
  return toPositiveNumber(
    process.env.ADMIN_ACCESS_PROOF_TTL_SECONDS,
    DEFAULT_ADMIN_ACCESS_PROOF_TTL_SECONDS,
  );
}

function getAdminAccessKeyCookieConfig(expiresAt?: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    maxAge: expiresAt ? getAdminAccessProofTtlSeconds() : 0,
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

  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return false;
  }

  return normalizedValue === configuredKey;
}

export function setAdminAccessKeyCookie(response: NextResponse, value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    clearAdminAccessKeyCookie(response);
    return;
  }

  const expiresAt = new Date(Date.now() + getAdminAccessProofTtlSeconds() * 1000);

  response.cookies.set(
    ADMIN_ACCESS_KEY_COOKIE_NAME,
    normalizedValue,
    getAdminAccessKeyCookieConfig(expiresAt),
  );
}

export function clearAdminAccessKeyCookie(response: NextResponse) {
  response.cookies.set(ADMIN_ACCESS_KEY_COOKIE_NAME, "", {
    ...getAdminAccessKeyCookieConfig(),
  });
}

export function getAdminConsoleAllowedEmails() {
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS;

  if (!allowedEmails?.trim()) {
    if (process.env.NODE_ENV !== "production") {
      return new Set<string>(["admin@local.test"]);
    }

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

const DEFAULT_ADMIN_NEXT_PATH = "/admin/users";
const ADMIN_AUTH_PATHS = new Set([
  "/access",
  "/sign-in",
]);

function normalizeAdminNextCandidate(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue?.startsWith("/")) {
    return null;
  }

  return normalizedValue;
}

export function normalizeAdminNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_ADMIN_NEXT_PATH,
) {
  const normalizedValue = normalizeAdminNextCandidate(value);

  if (!normalizedValue) {
    return fallback;
  }

  try {
    const parsedUrl = new URL(normalizedValue, "http://admin.local");
    const pathname = parsedUrl.pathname;

    if (!ADMIN_AUTH_PATHS.has(pathname)) {
      return `${pathname}${parsedUrl.search}`;
    }

    return normalizeAdminNextPath(parsedUrl.searchParams.get("next"), fallback);
  } catch {
    return fallback;
  }
}
