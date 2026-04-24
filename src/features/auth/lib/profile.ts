import { NICKNAME_PATTERN } from "@/features/auth/constants";
import type { AuthUser, OnboardingStep, UserRole } from "@/features/auth/types";

const RESERVED_PROFILE_PATH_SEGMENTS = new Set([
  "access",
  "admin",
  "api",
  "bookmarks",
  "complete-profile",
  "create-topic",
  "discussions",
  "drafts",
  "favicon.ico",
  "forgot-password",
  "profile",
  "reset-password",
  "robots.txt",
  "settings",
  "sign-in",
  "sign-up",
  "sitemap.xml",
]);

export const RESERVED_NICKNAME_MESSAGE = "Это имя аккаунта недоступно.";

export function sanitizeProfileText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeNickname(value: string | null | undefined) {
  return sanitizeProfileText(value).replace(/^@+/, "").toLowerCase();
}

export function buildDisplayName(params: {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  role: UserRole;
}) {
  if (params.role === "specialist") {
    const specialistName = [params.firstName, params.lastName]
      .map((part) => sanitizeProfileText(part))
      .filter(Boolean)
      .join(" ");

    if (specialistName) {
      return specialistName;
    }
  }

  const nickname = sanitizeProfileText(params.nickname);

  if (nickname) {
    return nickname;
  }

  const fallbackLocalPart = params.email?.split("@")[0]?.trim();
  return fallbackLocalPart || "Новый профиль";
}

export function resolveOnboardingStep(params: {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  onboardingStep?: OnboardingStep | null;
  role: UserRole;
}) {
  if (params.onboardingStep === "role") {
    return "role" as const;
  }

  if (params.role === "specialist") {
    return sanitizeProfileText(params.firstName) && sanitizeProfileText(params.lastName)
      ? ("complete" as const)
      : ("specialist-profile" as const);
  }

  return normalizeNickname(params.nickname)
    ? ("complete" as const)
    : ("user-profile" as const);
}

export function buildPostAuthRedirectPath(user: AuthUser, nextPath: string) {
  return resolveOnboardingStep(user) === "complete"
    ? nextPath
    : `/complete-profile?next=${encodeURIComponent(nextPath)}`;
}

export function getUserHandle(user: Pick<AuthUser, "displayName" | "nickname">) {
  return user.nickname ? `@${user.nickname}` : user.displayName;
}

export function isReservedProfilePathSegment(value: string | null | undefined) {
  const normalizedValue = normalizeNickname(value);
  return normalizedValue ? RESERVED_PROFILE_PATH_SEGMENTS.has(normalizedValue) : false;
}

export function buildProfilePathFromNickname(nickname: string | null | undefined) {
  const normalizedNickname = normalizeNickname(nickname);

  if (
    !normalizedNickname
    || !NICKNAME_PATTERN.test(normalizedNickname)
    || isReservedProfilePathSegment(normalizedNickname)
  ) {
    return null;
  }

  return `/${encodeURIComponent(normalizedNickname)}`;
}

export function buildOwnProfilePath(user: Pick<AuthUser, "nickname">) {
  return buildProfilePathFromNickname(user.nickname);
}

export function buildPublicProfilePathFromHandle(handle: string | null | undefined) {
  const sanitizedHandle = sanitizeProfileText(handle);

  if (!sanitizedHandle.startsWith("@")) {
    return null;
  }

  const normalizedHandle = sanitizedHandle.replace(/^@+/, "");
  return buildProfilePathFromNickname(normalizedHandle);
}
