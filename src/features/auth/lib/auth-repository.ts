import "server-only";

import { randomUUID } from "node:crypto";
import { execAuthPostgres, isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { isBootstrapAdminEmail } from "@/features/auth/lib/bootstrap-admin";
import type {
  AuthSession,
  AuthUser,
  OnboardingStep,
  SpecialistStatus,
  UserRole,
} from "@/features/auth/types";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  patronymic: string | null;
  avatar_url: string | null;
  avatar_source_url: string | null;
  avatar_card_url: string | null;
  profile_description: string | null;
  specialties_json: string | null;
  role: UserRole;
  specialist_status: SpecialistStatus;
  is_moderator: number | boolean;
  is_banned: number | boolean;
  ban_reason: string | null;
  onboarding_step: OnboardingStep;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

const PG_USER_COLUMNS = `
  users.id,
  users.email,
  users.password_hash,
  users.display_name,
  users.nickname,
  users.first_name,
  users.last_name,
  users.patronymic,
  users.avatar_url,
  users.avatar_source_url,
  users.avatar_card_url,
  users.profile_description,
  users.specialties_json,
  users.role,
  users.specialist_status,
  users.is_moderator,
  users.is_banned,
  users.ban_reason,
  users.onboarding_step,
  users.created_at::text AS created_at,
  users.updated_at::text AS updated_at
`;

const PG_SESSION_COLUMNS = `
  id,
  user_id,
  token_hash,
  expires_at::text AS expires_at,
  created_at::text AS created_at
`;

const PG_PASSWORD_RESET_TOKEN_COLUMNS = `
  id,
  user_id,
  token_hash,
  expires_at::text AS expires_at,
  used_at::text AS used_at,
  created_at::text AS created_at
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

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function mapUser(row: UserRow): AuthUser {
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
    profileDescription: row.profile_description,
    specialties: parseSpecialties(row.specialties_json),
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

function mapSession(row: SessionRow): AuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function readUserRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as UserRow;
}

function readSessionRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as SessionRow;
}

function readPasswordResetTokenRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as PasswordResetTokenRow;
}

async function queryPgRows<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

async function queryPgOne<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const rows = await queryPgRows<T>(query, values);
  return rows[0] ?? null;
}

async function execPg(query: string, values: unknown[] = []) {
  await execAuthPostgres(query, values);
}

export async function deleteExpiredSessions() {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM sessions WHERE expires_at <= $1", [
      new Date().toISOString(),
    ]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .run(new Date().toISOString());
}

export async function deleteExpiredPasswordResetTokens() {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM password_reset_tokens WHERE expires_at <= $1", [
      new Date().toISOString(),
    ]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?")
    .run(new Date().toISOString());
}

export async function findUserByEmail(email: string) {
  if (isPostgresAuthEnabled()) {
    const row = readUserRow(
      await queryPgOne<UserRow>(
        `SELECT ${PG_USER_COLUMNS} FROM users WHERE email = $1 LIMIT 1`,
        [email],
      ),
    );

    return row ? mapUser(row) : null;
  }

  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
    .get(email);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export async function findUserWithPasswordByEmail(email: string) {
  if (isPostgresAuthEnabled()) {
    const row = readUserRow(
      await queryPgOne<UserRow>(
        `SELECT ${PG_USER_COLUMNS} FROM users WHERE email = $1 LIMIT 1`,
        [email],
      ),
    );

    if (!row) {
      return null;
    }

    return {
      passwordHash: row.password_hash,
      user: mapUser(row),
    };
  }

  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
    .get(email);

  const row = readUserRow(result);

  if (!row) {
    return null;
  }

  return {
    passwordHash: row.password_hash,
    user: mapUser(row),
  };
}

export async function findUserByNickname(nickname: string) {
  if (isPostgresAuthEnabled()) {
    const row = readUserRow(
      await queryPgOne<UserRow>(
        `SELECT ${PG_USER_COLUMNS} FROM users WHERE nickname = $1 LIMIT 1`,
        [nickname],
      ),
    );

    return row ? mapUser(row) : null;
  }

  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE nickname = ? LIMIT 1")
    .get(nickname);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export async function findUserById(id: string) {
  if (isPostgresAuthEnabled()) {
    const row = readUserRow(
      await queryPgOne<UserRow>(
        `SELECT ${PG_USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
        [id],
      ),
    );

    return row ? mapUser(row) : null;
  }

  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .get(id);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export async function countUsersWithRole(role: UserRole) {
  if (isPostgresAuthEnabled()) {
    const result = await queryPgOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role = $1",
      [role],
    );

    return Number(result?.count ?? 0);
  }

  const result = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = ?")
    .get(role) as {
    count: number | bigint;
  };

  return Number(result.count);
}

export async function countModerators() {
  if (isPostgresAuthEnabled()) {
    const result = await queryPgOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE is_moderator = TRUE",
    );

    return Number(result?.count ?? 0);
  }

  const result = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE is_moderator = 1")
    .get() as {
    count: number | bigint;
  };

  return Number(result.count);
}

export async function createUser({
  avatarUrl = null,
  avatarSourceUrl = null,
  avatarCardUrl = null,
  displayName,
  email,
  firstName = null,
  isModerator = false,
  isBanned = false,
  lastName = null,
  nickname = null,
  onboardingStep = "role",
  passwordHash,
  profileDescription = null,
  patronymic = null,
  role = "user",
  specialties = [],
  specialistStatus = "none",
}: {
  avatarUrl?: string | null;
  avatarSourceUrl?: string | null;
  avatarCardUrl?: string | null;
  displayName: string;
  email: string;
  firstName?: string | null;
  isModerator?: boolean;
  isBanned?: boolean;
  lastName?: string | null;
  nickname?: string | null;
  onboardingStep?: OnboardingStep;
  passwordHash: string;
  profileDescription?: string | null;
  patronymic?: string | null;
  role?: UserRole;
  specialties?: string[];
  specialistStatus?: SpecialistStatus;
}) {
  const now = new Date().toISOString();
  const id = randomUUID();

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          display_name,
          nickname,
          first_name,
          last_name,
          patronymic,
          avatar_url,
          avatar_source_url,
          avatar_card_url,
          profile_description,
          specialties_json,
          role,
          specialist_status,
          is_moderator,
          is_banned,
          ban_reason,
          onboarding_step,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, NULL, $18, $19, $20
        )
      `,
      [
        id,
        email,
        passwordHash,
        displayName,
        nickname,
        firstName,
        lastName,
        patronymic,
        avatarUrl,
        avatarSourceUrl,
        avatarCardUrl,
        profileDescription,
        JSON.stringify(specialties),
        role,
        specialistStatus,
        isModerator,
        isBanned,
        onboardingStep,
        now,
        now,
      ],
    );

    return findUserById(id);
  }

  getDatabase()
    .prepare(`
      INSERT INTO users (
        id,
        email,
        password_hash,
        display_name,
        nickname,
        first_name,
        last_name,
        patronymic,
        avatar_url,
        avatar_source_url,
        avatar_card_url,
        profile_description,
        specialties_json,
        role,
        specialist_status,
        is_moderator,
        is_banned,
        ban_reason,
        onboarding_step,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?
      )
    `)
    .run(
      id,
      email,
      passwordHash,
      displayName,
      nickname,
      firstName,
      lastName,
      patronymic,
      avatarUrl,
      avatarSourceUrl,
      avatarCardUrl,
      profileDescription,
      JSON.stringify(specialties),
      role,
      specialistStatus,
      isModerator ? 1 : 0,
      isBanned ? 1 : 0,
      onboardingStep,
      now,
      now,
    );

  return findUserById(id);
}

export async function createSession({
  expiresAt,
  tokenHash,
  userId,
}: {
  expiresAt: string;
  tokenHash: string;
  userId: string;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        INSERT INTO sessions (
          id,
          user_id,
          token_hash,
          expires_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [id, userId, tokenHash, expiresAt, createdAt],
    );

    const row = readSessionRow(
      await queryPgOne<SessionRow>(
        `SELECT ${PG_SESSION_COLUMNS} FROM sessions WHERE id = $1 LIMIT 1`,
        [id],
      ),
    );

    return row ? mapSession(row) : null;
  }

  getDatabase()
    .prepare(`
      INSERT INTO sessions (
        id,
        user_id,
        token_hash,
        expires_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, userId, tokenHash, expiresAt, createdAt);

  const result = getDatabase()
    .prepare("SELECT * FROM sessions WHERE id = ? LIMIT 1")
    .get(id);
  const row = readSessionRow(result);

  return row ? mapSession(row) : null;
}

export async function createPasswordResetToken({
  expiresAt,
  tokenHash,
  userId,
}: {
  expiresAt: string;
  tokenHash: string;
  userId: string;
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        INSERT INTO password_reset_tokens (
          id,
          user_id,
          token_hash,
          expires_at,
          used_at,
          created_at
        ) VALUES ($1, $2, $3, $4, NULL, $5)
      `,
      [id, userId, tokenHash, expiresAt, createdAt],
    );

    return readPasswordResetTokenRow(
      await queryPgOne<PasswordResetTokenRow>(
        `SELECT ${PG_PASSWORD_RESET_TOKEN_COLUMNS}
         FROM password_reset_tokens
         WHERE id = $1
         LIMIT 1`,
        [id],
      ),
    );
  }

  getDatabase()
    .prepare(`
      INSERT INTO password_reset_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at
      ) VALUES (?, ?, ?, ?, NULL, ?)
    `)
    .run(id, userId, tokenHash, expiresAt, createdAt);

  const result = getDatabase()
    .prepare("SELECT * FROM password_reset_tokens WHERE id = ? LIMIT 1")
    .get(id);

  return readPasswordResetTokenRow(result);
}

export async function findSessionWithUserByTokenHash(tokenHash: string) {
  const now = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    const result = await queryPgOne<
      {
        session_id: string;
        session_user_id: string;
        session_token_hash: string;
        session_expires_at: string;
        session_created_at: string;
      } & UserRow
    >(
      `
        SELECT
          sessions.id AS session_id,
          sessions.user_id AS session_user_id,
          sessions.token_hash AS session_token_hash,
          sessions.expires_at::text AS session_expires_at,
          sessions.created_at::text AS session_created_at,
          ${PG_USER_COLUMNS}
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = $1 AND sessions.expires_at > $2
        LIMIT 1
      `,
      [tokenHash, now],
    );

    if (!result) {
      return null;
    }

    return {
      session: mapSession({
        id: result.session_id,
        user_id: result.session_user_id,
        token_hash: result.session_token_hash,
        expires_at: result.session_expires_at,
        created_at: result.session_created_at,
      }),
      user: mapUser(result),
    };
  }

  const result = getDatabase()
    .prepare(`
      SELECT
        sessions.id AS session_id,
        sessions.user_id AS session_user_id,
        sessions.token_hash AS session_token_hash,
        sessions.expires_at AS session_expires_at,
        sessions.created_at AS session_created_at,
        users.id,
        users.email,
        users.password_hash,
        users.display_name,
        users.nickname,
        users.first_name,
        users.last_name,
        users.patronymic,
        users.avatar_url,
        users.avatar_source_url,
        users.avatar_card_url,
        users.profile_description,
        users.specialties_json,
        users.role,
        users.specialist_status,
        users.is_moderator,
        users.is_banned,
        users.ban_reason,
        users.onboarding_step,
        users.created_at,
        users.updated_at
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      LIMIT 1
    `)
    .get(tokenHash, now);

  if (!result) {
    return null;
  }

  const row = result as {
    session_id: string;
    session_user_id: string;
    session_token_hash: string;
    session_expires_at: string;
    session_created_at: string;
  } & UserRow;

  return {
    session: mapSession({
      id: row.session_id,
      user_id: row.session_user_id,
      token_hash: row.session_token_hash,
      expires_at: row.session_expires_at,
      created_at: row.session_created_at,
    }),
    user: mapUser(row),
  };
}

export async function findPasswordResetTokenWithUserByTokenHash(tokenHash: string) {
  const now = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    const result = await queryPgOne<
      {
        password_reset_token_id: string;
        password_reset_token_user_id: string;
        password_reset_token_hash: string;
        password_reset_token_expires_at: string;
        password_reset_token_used_at: string | null;
        password_reset_token_created_at: string;
      } & UserRow
    >(
      `
        SELECT
          password_reset_tokens.id AS password_reset_token_id,
          password_reset_tokens.user_id AS password_reset_token_user_id,
          password_reset_tokens.token_hash AS password_reset_token_hash,
          password_reset_tokens.expires_at::text AS password_reset_token_expires_at,
          password_reset_tokens.used_at::text AS password_reset_token_used_at,
          password_reset_tokens.created_at::text AS password_reset_token_created_at,
          ${PG_USER_COLUMNS}
        FROM password_reset_tokens
        INNER JOIN users ON users.id = password_reset_tokens.user_id
        WHERE
          password_reset_tokens.token_hash = $1
          AND password_reset_tokens.used_at IS NULL
          AND password_reset_tokens.expires_at > $2
        LIMIT 1
      `,
      [tokenHash, now],
    );

    if (!result) {
      return null;
    }

    return {
      token: {
        id: result.password_reset_token_id,
        user_id: result.password_reset_token_user_id,
        token_hash: result.password_reset_token_hash,
        expires_at: result.password_reset_token_expires_at,
        used_at: result.password_reset_token_used_at,
        created_at: result.password_reset_token_created_at,
      },
      user: mapUser(result),
    };
  }

  const result = getDatabase()
    .prepare(`
      SELECT
        password_reset_tokens.id AS password_reset_token_id,
        password_reset_tokens.user_id AS password_reset_token_user_id,
        password_reset_tokens.token_hash AS password_reset_token_hash,
        password_reset_tokens.expires_at AS password_reset_token_expires_at,
        password_reset_tokens.used_at AS password_reset_token_used_at,
        password_reset_tokens.created_at AS password_reset_token_created_at,
        users.id,
        users.email,
        users.password_hash,
        users.display_name,
        users.nickname,
        users.first_name,
        users.last_name,
        users.patronymic,
        users.avatar_url,
        users.avatar_source_url,
        users.avatar_card_url,
        users.profile_description,
        users.specialties_json,
        users.role,
        users.specialist_status,
        users.is_moderator,
        users.is_banned,
        users.ban_reason,
        users.onboarding_step,
        users.created_at,
        users.updated_at
      FROM password_reset_tokens
      INNER JOIN users ON users.id = password_reset_tokens.user_id
      WHERE
        password_reset_tokens.token_hash = ?
        AND password_reset_tokens.used_at IS NULL
        AND password_reset_tokens.expires_at > ?
      LIMIT 1
    `)
    .get(tokenHash, now);

  if (!result) {
    return null;
  }

  const row = result as {
    password_reset_token_id: string;
    password_reset_token_user_id: string;
    password_reset_token_hash: string;
    password_reset_token_expires_at: string;
    password_reset_token_used_at: string | null;
    password_reset_token_created_at: string;
  } & UserRow;

  return {
    token: {
      id: row.password_reset_token_id,
      user_id: row.password_reset_token_user_id,
      token_hash: row.password_reset_token_hash,
      expires_at: row.password_reset_token_expires_at,
      used_at: row.password_reset_token_used_at,
      created_at: row.password_reset_token_created_at,
    },
    user: mapUser(row),
  };
}

export async function updateUserProfileFields({
  displayName,
  firstName,
  lastName,
  nickname,
  onboardingStep,
  patronymic,
  role,
  userId,
}: {
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  onboardingStep?: OnboardingStep;
  patronymic?: string | null;
  role?: UserRole;
  userId: string;
}) {
  const currentUser = await findUserById(userId);

  if (!currentUser) {
    return null;
  }

  const nextUpdatedAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        UPDATE users
        SET
          display_name = $1,
          nickname = $2,
          first_name = $3,
          last_name = $4,
          patronymic = $5,
          role = $6,
          onboarding_step = $7,
          updated_at = $8
        WHERE id = $9
      `,
      [
        displayName ?? currentUser.displayName,
        nickname === undefined ? currentUser.nickname : nickname,
        firstName === undefined ? currentUser.firstName : firstName,
        lastName === undefined ? currentUser.lastName : lastName,
        patronymic === undefined ? currentUser.patronymic : patronymic,
        role ?? currentUser.role,
        onboardingStep ?? currentUser.onboardingStep,
        nextUpdatedAt,
        userId,
      ],
    );

    return findUserById(userId);
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        display_name = ?,
        nickname = ?,
        first_name = ?,
        last_name = ?,
        patronymic = ?,
        role = ?,
        onboarding_step = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      displayName ?? currentUser.displayName,
      nickname === undefined ? currentUser.nickname : nickname,
      firstName === undefined ? currentUser.firstName : firstName,
      lastName === undefined ? currentUser.lastName : lastName,
      patronymic === undefined ? currentUser.patronymic : patronymic,
      role ?? currentUser.role,
      onboardingStep ?? currentUser.onboardingStep,
      nextUpdatedAt,
      userId,
    );

  return findUserById(userId);
}

export async function updateUserAdminFields({
  isModerator,
  role,
  specialistStatus,
  userId,
}: {
  isModerator?: boolean;
  role?: UserRole;
  specialistStatus?: SpecialistStatus;
  userId: string;
}) {
  const currentUser = await findUserById(userId);

  if (!currentUser) {
    return null;
  }

  const nextUpdatedAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        UPDATE users
        SET
          role = $1,
          specialist_status = $2,
          is_moderator = $3,
          updated_at = $4
        WHERE id = $5
      `,
      [
        role ?? currentUser.role,
        specialistStatus ?? currentUser.specialistStatus,
        isModerator === undefined ? currentUser.isModerator : isModerator,
        nextUpdatedAt,
        userId,
      ],
    );

    return findUserById(userId);
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        role = ?,
        specialist_status = ?,
        is_moderator = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      role ?? currentUser.role,
      specialistStatus ?? currentUser.specialistStatus,
      isModerator === undefined ? (currentUser.isModerator ? 1 : 0) : isModerator ? 1 : 0,
      nextUpdatedAt,
      userId,
    );

  return findUserById(userId);
}

export async function updateUserAdminManagedFields({
  avatarCardUrl,
  avatarSourceUrl,
  avatarUrl,
  banReason,
  displayName,
  firstName,
  isBanned,
  lastName,
  nickname,
  onboardingStep,
  profileDescription,
  role,
  specialties,
  specialistStatus,
  userId,
}: {
  avatarCardUrl?: string | null;
  avatarSourceUrl?: string | null;
  avatarUrl?: string | null;
  banReason?: string | null;
  displayName?: string;
  firstName?: string | null;
  isBanned?: boolean;
  lastName?: string | null;
  nickname?: string | null;
  onboardingStep?: OnboardingStep;
  profileDescription?: string | null;
  role?: UserRole;
  specialties?: string[];
  specialistStatus?: SpecialistStatus;
  userId: string;
}) {
  const currentUser = await findUserById(userId);

  if (!currentUser) {
    return null;
  }

  const nextUpdatedAt = new Date().toISOString();
  const nextSpecialties = specialties ?? currentUser.specialties;

  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        UPDATE users
        SET
          display_name = $1,
          nickname = $2,
          first_name = $3,
          last_name = $4,
          avatar_url = $5,
          avatar_source_url = $6,
          avatar_card_url = $7,
          profile_description = $8,
          specialties_json = $9,
          role = $10,
          specialist_status = $11,
          is_banned = $12,
          ban_reason = $13,
          onboarding_step = $14,
          updated_at = $15
        WHERE id = $16
      `,
      [
        displayName ?? currentUser.displayName,
        nickname === undefined ? currentUser.nickname : nickname,
        firstName === undefined ? currentUser.firstName : firstName,
        lastName === undefined ? currentUser.lastName : lastName,
        avatarUrl === undefined ? currentUser.avatarUrl : avatarUrl,
        avatarSourceUrl === undefined ? currentUser.avatarSourceUrl : avatarSourceUrl,
        avatarCardUrl === undefined ? currentUser.avatarCardUrl : avatarCardUrl,
        profileDescription === undefined ? currentUser.profileDescription : profileDescription,
        JSON.stringify(nextSpecialties),
        role ?? currentUser.role,
        specialistStatus ?? currentUser.specialistStatus,
        isBanned === undefined ? currentUser.isBanned : isBanned,
        banReason === undefined ? currentUser.banReason : banReason,
        onboardingStep ?? currentUser.onboardingStep,
        nextUpdatedAt,
        userId,
      ],
    );

    return findUserById(userId);
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        display_name = ?,
        nickname = ?,
        first_name = ?,
        last_name = ?,
        avatar_url = ?,
        avatar_source_url = ?,
        avatar_card_url = ?,
        profile_description = ?,
        specialties_json = ?,
        role = ?,
        specialist_status = ?,
        is_banned = ?,
        ban_reason = ?,
        onboarding_step = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      displayName ?? currentUser.displayName,
      nickname === undefined ? currentUser.nickname : nickname,
      firstName === undefined ? currentUser.firstName : firstName,
      lastName === undefined ? currentUser.lastName : lastName,
      avatarUrl === undefined ? currentUser.avatarUrl : avatarUrl,
      avatarSourceUrl === undefined ? currentUser.avatarSourceUrl : avatarSourceUrl,
      avatarCardUrl === undefined ? currentUser.avatarCardUrl : avatarCardUrl,
      profileDescription === undefined ? currentUser.profileDescription : profileDescription,
      JSON.stringify(nextSpecialties),
      role ?? currentUser.role,
      specialistStatus ?? currentUser.specialistStatus,
      isBanned === undefined ? (currentUser.isBanned ? 1 : 0) : isBanned ? 1 : 0,
      banReason === undefined ? currentUser.banReason : banReason,
      onboardingStep ?? currentUser.onboardingStep,
      nextUpdatedAt,
      userId,
    );

  return findUserById(userId);
}

export async function deleteUserById(userId: string) {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM users WHERE id = $1", [userId]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM users WHERE id = ?")
    .run(userId);
}

export async function updateUserPasswordHash({
  passwordHash,
  userId,
}: {
  passwordHash: string;
  userId: string;
}) {
  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = $2
        WHERE id = $3
      `,
      [passwordHash, new Date().toISOString(), userId],
    );

    return findUserById(userId);
  }

  getDatabase()
    .prepare(`
      UPDATE users
      SET
        password_hash = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(passwordHash, new Date().toISOString(), userId);

  return findUserById(userId);
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .run(tokenHash);
}

export async function deleteSessionsByUserId(userId: string) {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM sessions WHERE user_id = $1", [userId]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM sessions WHERE user_id = ?")
    .run(userId);
}

export async function deletePasswordResetTokensByUserId(userId: string) {
  if (isPostgresAuthEnabled()) {
    await execPg("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
    return;
  }

  getDatabase()
    .prepare("DELETE FROM password_reset_tokens WHERE user_id = ?")
    .run(userId);
}

export async function markPasswordResetTokenAsUsed(tokenId: string) {
  if (isPostgresAuthEnabled()) {
    await execPg(
      `
        UPDATE password_reset_tokens
        SET used_at = $1
        WHERE id = $2
      `,
      [new Date().toISOString(), tokenId],
    );
    return;
  }

  getDatabase()
    .prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE id = ?
    `)
    .run(new Date().toISOString(), tokenId);
}
