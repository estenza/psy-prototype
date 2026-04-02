import "server-only";

import { notFound, redirect } from "next/navigation";
import { canAccessModeratorActions } from "@/features/auth/lib/permissions";
import { getCurrentUser } from "@/features/auth/lib/current-user";

export class AdminAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

export async function requireModeratorUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new AdminAccessError("Unauthorized", 401);
  }

  if (!canAccessModeratorActions(currentUser)) {
    throw new AdminAccessError("Forbidden", 403);
  }

  return currentUser;
}

export async function requireModeratorPageAccess() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  if (!canAccessModeratorActions(currentUser)) {
    notFound();
  }

  return currentUser;
}
