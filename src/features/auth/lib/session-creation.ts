import "server-only";

import { createSession, deleteExpiredSessions } from "@/features/auth/lib/auth-repository";
import {
  buildSessionExpiresAt,
  generateSessionToken,
  hashSessionToken,
} from "@/features/auth/lib/session";

export async function createSessionForUser(userId: string) {
  await deleteExpiredSessions();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiresAt();

  await createSession({ expiresAt, tokenHash, userId });

  return { token, expiresAt };
}
