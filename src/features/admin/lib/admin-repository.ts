import "server-only";

import { isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { normalizeAdminSpecialties } from "@/features/admin/lib/admin-specialties";
import type { AdminListedUser, AdminUsersFilters } from "@/features/admin/types";
import { isBootstrapAdminEmail } from "@/features/auth/lib/bootstrap-admin";
import { parseSpecialistEducationJson } from "@/features/auth/lib/education";
import { parseSpecialistWorkTopicsJson } from "@/features/specialists/lib/specialist-work-topics";
import type {
  OnboardingStep,
  SpecialistGender,
  SpecialistStatus,
  UserRole,
} from "@/features/auth/types";

type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  patronymic: string | null;
  avatar_url: string | null;
  avatar_source_url: string | null;
  avatar_card_url: string | null;
  profile_cover_url: string | null;
  profile_description: string | null;
  education_json: string | null;
  specialties_json: string | null;
  work_topics_json: string | null;
  specialist_gender: SpecialistGender | null;
  specialist_birth_date: string | null;
  specialist_phone_country: string | null;
  specialist_phone_number: string | null;
  specialist_telegram_url: string | null;
  specialist_max_url: string | null;
  specialist_whatsapp_url: string | null;
  role: UserRole;
  specialist_status: SpecialistStatus;
  is_moderator: number | boolean;
  is_banned: number | boolean;
  ban_reason: string | null;
  onboarding_step: OnboardingStep;
  created_at: string;
  updated_at: string;
};

const PG_ADMIN_USER_COLUMNS = `
  id,
  email,
  display_name,
  nickname,
  first_name,
  last_name,
  patronymic,
  avatar_url,
  avatar_source_url,
  avatar_card_url,
  profile_cover_url,
  profile_description,
  education_json,
  specialties_json,
  work_topics_json,
  specialist_gender,
  specialist_birth_date,
  specialist_phone_country,
  specialist_phone_number,
  specialist_telegram_url,
  specialist_max_url,
  specialist_whatsapp_url,
  role,
  specialist_status,
  is_moderator,
  is_banned,
  ban_reason,
  onboarding_step,
  created_at::text AS created_at,
  updated_at::text AS updated_at
`;

function parseSpecialties(value: string | null | undefined) {
  if (!value?.trim()) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeAdminSpecialties(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return [];
  }
}

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
    avatarSourceUrl: row.avatar_source_url,
    avatarCardUrl: row.avatar_card_url,
    profileCoverUrl: row.profile_cover_url,
    profileDescription: row.profile_description,
    education: parseSpecialistEducationJson(row.education_json),
    specialties: parseSpecialties(row.specialties_json),
    workTopics: parseSpecialistWorkTopicsJson(row.work_topics_json),
    specialistGender: row.specialist_gender,
    specialistBirthDate: row.specialist_birth_date,
    specialistPhoneCountry: row.specialist_phone_country,
    specialistPhoneNumber: row.specialist_phone_number,
    specialistTelegramUrl: row.specialist_telegram_url,
    specialistMaxUrl: row.specialist_max_url,
    specialistWhatsappUrl: row.specialist_whatsapp_url,
    role: row.role,
    specialistStatus: row.specialist_status,
    isAdmin: isBootstrapAdminEmail(row.email),
    isBanned: Boolean(row.is_banned),
    banReason: row.ban_reason,
    isModerator: Boolean(row.is_moderator),
    onboardingStep: row.onboarding_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminUsers(filters: AdminUsersFilters) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.role !== "all") {
    if (filters.role === "moderator") {
      conditions.push(isPostgresAuthEnabled() ? "is_moderator = TRUE" : "is_moderator = 1");
    } else {
      conditions.push(isPostgresAuthEnabled() ? `role = $${params.length + 1}` : "role = ?");
      params.push(filters.role);
    }
  }

  if (filters.specialistStatus !== "all") {
    conditions.push(
      isPostgresAuthEnabled()
        ? `specialist_status = $${params.length + 1}`
        : "specialist_status = ?",
    );
    params.push(filters.specialistStatus);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  if (isPostgresAuthEnabled()) {
    const rows = await queryAuthPostgres<AdminUserRow>(
      `
        SELECT
          ${PG_ADMIN_USER_COLUMNS}
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
      `,
      params,
    );

    return rows.rows.map(mapAdminUser);
  }

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
        avatar_source_url,
        avatar_card_url,
        profile_cover_url,
        profile_description,
        education_json,
        specialties_json,
        work_topics_json,
        specialist_gender,
        specialist_birth_date,
        specialist_phone_country,
        specialist_phone_number,
        specialist_telegram_url,
        specialist_max_url,
        specialist_whatsapp_url,
        role,
        specialist_status,
        is_moderator,
        is_banned,
        ban_reason,
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
