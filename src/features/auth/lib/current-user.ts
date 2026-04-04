import "server-only";

import { readSessionTokenFromCookies } from "@/features/auth/lib/session";
import { getCurrentUserBySessionToken } from "@/features/auth/lib/auth-service";

export async function getCurrentUser() {
  const sessionToken = await readSessionTokenFromCookies();

  if (!sessionToken) {
    return null;
  }

  return await getCurrentUserBySessionToken(sessionToken);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
