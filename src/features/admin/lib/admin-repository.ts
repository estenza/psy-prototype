import "server-only";

import { getDatabase } from "@/lib/db";
import type { AdminListedUser, AdminUsersFilters } from "@/features/admin/types";
import type { OnboardingStep, SpecialistStatus, UserRole } from "@/features/auth/types";

type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  patronymic: string | null;
  avatar_url: string | null;
  role: UserRole;
  specialist_status: SpecialistStatus;
  is_moderator: number;
  onboarding_step: OnboardingStep;
  created_at: string;
  updated_at: string;
};

function mapAdminUser(row: AdminUserRow): AdminListedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    nickname: row.nickname,
    firstName: row.first_name,
    lastName: row.last_name,
    patronymic: row.patronymic,
    avatarUrl: row.avatar_url,
    role: row.role,
    specialistStatus: row.specialist_status,
    isModerator: Boolean(row.is_moderator),
    onboardingStep: row.onboarding_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listAdminUsers(filters: AdminUsersFilters) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.role !== "all") {
    if (filters.role === "moderator") {
      conditions.push("is_moderator = 1");
    } else {
      conditions.push("role = ?");
      params.push(filters.role);
    }
  }

  if (filters.specialistStatus !== "all") {
    conditions.push("specialist_status = ?");
    params.push(filters.specialistStatus);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        email,
        display_name,
        nickname,
        first_name,
        last_name,
        patronymic,
        avatar_url,
        role,
        specialist_status,
        is_moderator,
        onboarding_step,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `)
    .all(...params) as AdminUserRow[];

  return rows.map(mapAdminUser);
}
