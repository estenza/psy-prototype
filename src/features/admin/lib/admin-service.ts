import "server-only";

import { listAdminUsers } from "@/features/admin/lib/admin-repository";
import type {
  AdminSpecialistStatusFilter,
  AdminUpdateUserPayload,
  AdminUserRoleFilter,
  AdminUsersFilters,
} from "@/features/admin/types";
import {
  countModerators,
  findUserById,
  updateUserAdminFields,
} from "@/features/auth/lib/auth-repository";
import type { SpecialistStatus, UserRole } from "@/features/auth/types";

const ROLE_FILTER_VALUES = new Set<AdminUserRoleFilter>([
  "all",
  "moderator",
  "specialist",
]);

const SPECIALIST_STATUS_FILTER_VALUES = new Set<AdminSpecialistStatusFilter>([
  "all",
  "none",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

const USER_ROLE_VALUES = new Set<UserRole>(["user", "specialist"]);
const SPECIALIST_STATUS_VALUES = new Set<SpecialistStatus>([
  "none",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

export class AdminServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminServiceError";
    this.status = status;
  }
}

export function normalizeAdminUsersFilters(input: {
  specialistStatus?: string | null;
  role?: string | null;
}): AdminUsersFilters {
  const role = ROLE_FILTER_VALUES.has((input.role ?? "all") as AdminUserRoleFilter)
    ? (input.role as AdminUserRoleFilter)
    : "all";
  const specialistStatus = SPECIALIST_STATUS_FILTER_VALUES.has(
    (input.specialistStatus ?? "all") as AdminSpecialistStatusFilter,
  )
    ? (input.specialistStatus as AdminSpecialistStatusFilter)
    : "all";

  return {
    specialistStatus,
    role,
  };
}

export async function getAdminUsers(filters: AdminUsersFilters) {
  return await listAdminUsers(filters);
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUpdateUserPayload,
) {
  const targetUser = await findUserById(userId);

  if (!targetUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  const nextRole = payload.role ?? targetUser.role;
  const nextSpecialistStatus =
    payload.specialistStatus ?? targetUser.specialistStatus;
  const nextIsModerator = payload.isModerator ?? targetUser.isModerator;

  if (!USER_ROLE_VALUES.has(nextRole)) {
    throw new AdminServiceError("Недопустимая роль.", 400);
  }

  if (!SPECIALIST_STATUS_VALUES.has(nextSpecialistStatus)) {
    throw new AdminServiceError("Недопустимый specialist status.", 400);
  }

  const isRemovingModeratorGrant = targetUser.isModerator && !nextIsModerator;

  if (isRemovingModeratorGrant && (await countModerators()) <= 1) {
    throw new AdminServiceError(
      "Нельзя снять роль у последнего модератора.",
      409,
    );
  }

  const updatedUser = await updateUserAdminFields({
    isModerator: nextIsModerator,
    role: nextRole,
    specialistStatus: nextSpecialistStatus,
    userId,
  });

  if (!updatedUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  return updatedUser;
}
