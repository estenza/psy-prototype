import "server-only";

import { createUser, findUserByEmail } from "@/features/auth/lib/auth-repository";
import {
  AuthServiceError,
  buildDefaultUserDisplayName,
  buildDefaultUserNickname,
  ensureUserProfileIdentity,
} from "@/features/auth/lib/auth-service";
import {
  isBootstrapModeratorEmail,
  syncBootstrapModeratorGrant,
} from "@/features/auth/lib/bootstrap-moderator";
import { createSessionForUser } from "@/features/auth/lib/session-creation";
import { fetchYandexUserProfile } from "@/features/auth/lib/yandex-oauth";
import type { AuthUser } from "@/features/auth/types";

async function resolveYandexUser({
  email,
  firstName,
  lastName,
}: {
  displayName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const existingUser = await findUserByEmail(email);

  if (existingUser?.isBanned) {
    throw new AuthServiceError({
      message: "Аккаунт заблокирован.",
      status: 403,
    });
  }

  if (existingUser) {
    return existingUser;
  }

  const createdUser = await createUser({
    displayName: await buildDefaultUserDisplayName(),
    email,
    firstName,
    isModerator: isBootstrapModeratorEmail(email),
    lastName,
    nickname: await buildDefaultUserNickname(email),
    onboardingStep: "user-profile",
    passwordHash: "oauth:yandex",
    role: "user",
  });

  if (!createdUser) {
    throw new AuthServiceError({
      message: "Не удалось войти через Yandex ID. Попробуйте ещё раз.",
      status: 500,
    });
  }

  return createdUser;
}

export async function createSessionFromYandexToken(accessToken: string): Promise<{
  expiresAt: string;
  sessionToken: string;
  user: AuthUser;
}> {
  const trimmedAccessToken = accessToken.trim();

  if (!trimmedAccessToken) {
    throw new AuthServiceError({
      message: "Не удалось войти через Yandex ID.",
      status: 400,
    });
  }

  const yandexProfile = await fetchYandexUserProfile(trimmedAccessToken);
  const user = await resolveYandexUser(yandexProfile);
  const resolvedUser = await syncBootstrapModeratorGrant(await ensureUserProfileIdentity(user));
  const session = await createSessionForUser(resolvedUser.id);

  return {
    expiresAt: session.expiresAt,
    sessionToken: session.token,
    user: resolvedUser,
  };
}
