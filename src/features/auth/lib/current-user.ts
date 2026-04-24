import "server-only";

import { readSessionTokenFromCookies } from "@/features/auth/lib/session";
import { getCurrentUserBySessionToken } from "@/features/auth/lib/auth-service";

function isRecoverableAuthStorageError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();

  return (
    normalizedMessage.includes("database disk image is malformed")
    || normalizedMessage.includes("sqlite_corrupt")
    || normalizedMessage.includes("database corruption")
  );
}

export async function getCurrentUser() {
  const sessionToken = await readSessionTokenFromCookies();

  if (!sessionToken) {
    return null;
  }

  try {
    return await getCurrentUserBySessionToken(sessionToken);
  } catch (error) {
    if (!isRecoverableAuthStorageError(error)) {
      throw error;
    }

    console.error("[auth/current-user] Recoverable auth storage failure during session lookup", {
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
