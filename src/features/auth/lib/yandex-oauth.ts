import "server-only";

import { AuthServiceError } from "@/features/auth/lib/auth-service";

const YANDEX_USER_INFO_URL = "https://login.yandex.ru/info";

type YandexUserInfoResponse = {
  default_email?: string;
  display_name?: string;
  emails?: string[];
  first_name?: string;
  id?: string;
  is_avatar_empty?: boolean;
  last_name?: string;
  login?: string;
  real_name?: string;
};

export type YandexUserProfile = {
  displayName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export function readYandexClientId() {
  return (
    process.env.YANDEX_CLIENT_ID?.trim()
    || process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID?.trim()
    || ""
  );
}

export function getYandexClientId() {
  const clientId = readYandexClientId();

  if (!clientId) {
    throw new AuthServiceError({
      message: "Yandex ID пока не настроен.",
      status: 503,
    });
  }

  return clientId;
}

export function buildYandexTokenRedirectUri(request: Request) {
  const explicitRedirectUri = process.env.YANDEX_REDIRECT_URI?.trim();

  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }

  return new URL("/auth/yandex/token", request.url).toString();
}

function normalizeYandexEmail(profile: YandexUserInfoResponse) {
  const email = profile.default_email || profile.emails?.[0] || "";
  return email.trim().toLowerCase();
}

function buildYandexDisplayName(profile: YandexUserInfoResponse, email: string) {
  return (
    profile.display_name?.trim()
    || profile.real_name?.trim()
    || [profile.first_name, profile.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ")
    || profile.login?.trim()
    || email.split("@")[0]?.trim()
    || "Новый профиль"
  );
}

export async function fetchYandexUserProfile(accessToken: string): Promise<YandexUserProfile> {
  const url = new URL(YANDEX_USER_INFO_URL);
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AuthServiceError({
      message: "Не удалось получить профиль Yandex ID.",
      status: 401,
    });
  }

  const profile = (await response.json()) as YandexUserInfoResponse;
  const email = normalizeYandexEmail(profile);

  if (!email) {
    throw new AuthServiceError({
      message: "Yandex ID не вернул email. Проверьте права приложения.",
      status: 401,
    });
  }

  return {
    displayName: buildYandexDisplayName(profile, email),
    email,
    firstName: profile.first_name?.trim() || null,
    lastName: profile.last_name?.trim() || null,
  };
}
