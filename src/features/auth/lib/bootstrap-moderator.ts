import "server-only";

import { findUserById, updateUserAdminFields } from "@/features/auth/lib/auth-repository";
import { isBootstrapAdminEmail } from "@/features/auth/lib/bootstrap-admin";
import type { SessionUser } from "@/features/auth/types";

function getBootstrapModeratorEmails() {
  return new Set(
    (process.env.AUTH_INITIAL_MODERATOR_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapModeratorEmail(email: string) {
  return (
    getBootstrapModeratorEmails().has(email.trim().toLowerCase())
    || isBootstrapAdminEmail(email)
  );
}

export async function syncBootstrapModeratorGrant(user: SessionUser) {
  if (!isBootstrapModeratorEmail(user.email) || user.isModerator) {
    return user;
  }

  await updateUserAdminFields({
    isModerator: true,
    userId: user.id,
  });

  return (await findUserById(user.id)) ?? {
    ...user,
    isModerator: true,
  };
}
