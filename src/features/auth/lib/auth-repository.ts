import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
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
  role: UserRole;
  specialist_status: SpecialistStatus;
  is_moderator: number;
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
    role: row.role,
    specialistStatus: row.specialist_status,
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

function readUserRow(result: Record<string, unknown> | undefined) {
  if (!result) {
    return null;
  }

  return result as unknown as UserRow;
}

function readSessionRow(result: Record<string, unknown> | undefined) {
  if (!result) {
    return null;
  }

  return result as unknown as SessionRow;
}

function readPasswordResetTokenRow(result: Record<string, unknown> | undefined) {
  if (!result) {
    return null;
  }

  return result as unknown as PasswordResetTokenRow;
}

export function deleteExpiredSessions() {
  getDatabase()
    .prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .run(new Date().toISOString());
}

export function deleteExpiredPasswordResetTokens() {
  getDatabase()
    .prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?")
    .run(new Date().toISOString());
}

export function findUserByEmail(email: string) {
  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
    .get(email);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export function findUserWithPasswordByEmail(email: string) {
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

export function findUserByNickname(nickname: string) {
  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE nickname = ? LIMIT 1")
    .get(nickname);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export function findUserById(id: string) {
  const result = getDatabase()
    .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .get(id);

  const row = readUserRow(result);
  return row ? mapUser(row) : null;
}

export function countUsersWithRole(role: UserRole) {
  const result = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = ?")
    .get(role) as {
    count: number | bigint;
  };

  return Number(result.count);
}

export function countModerators() {
  const result = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE is_moderator = 1")
    .get() as {
    count: number | bigint;
  };

  return Number(result.count);
}

export function createUser({
  avatarUrl = null,
  displayName,
  email,
  firstName = null,
  isModerator = false,
  lastName = null,
  nickname = null,
  onboardingStep = "role",
  passwordHash,
  patronymic = null,
  role = "user",
  specialistStatus = "none",
}: {
  avatarUrl?: string | null;
  displayName: string;
  email: string;
  firstName?: string | null;
  isModerator?: boolean;
  lastName?: string | null;
  nickname?: string | null;
  onboardingStep?: OnboardingStep;
  passwordHash: string;
  patronymic?: string | null;
  role?: UserRole;
  specialistStatus?: SpecialistStatus;
}) {
  const now = new Date().toISOString();
  const id = randomUUID();

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
        role,
        specialist_status,
        is_moderator,
        onboarding_step,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      role,
      specialistStatus,
      isModerator ? 1 : 0,
      onboardingStep,
      now,
      now,
    );

  return findUserById(id);
}

export function createSession({
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

export function createPasswordResetToken({
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

export function findSessionWithUserByTokenHash(tokenHash: string) {
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
        users.role,
        users.specialist_status,
        users.is_moderator,
        users.onboarding_step,
        users.created_at,
        users.updated_at
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      LIMIT 1
    `)
    .get(tokenHash, new Date().toISOString());

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

export function findPasswordResetTokenWithUserByTokenHash(tokenHash: string) {
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
        users.role,
        users.specialist_status,
        users.is_moderator,
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
    .get(tokenHash, new Date().toISOString());

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

export function updateUserProfileFields({
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
  const currentUser = findUserById(userId);

  if (!currentUser) {
    return null;
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
      new Date().toISOString(),
      userId,
    );

  return findUserById(userId);
}

export function updateUserAdminFields({
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
  const currentUser = findUserById(userId);

  if (!currentUser) {
    return null;
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
      new Date().toISOString(),
      userId,
    );

  return findUserById(userId);
}

export function updateUserPasswordHash({
  passwordHash,
  userId,
}: {
  passwordHash: string;
  userId: string;
}) {
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

export function deleteSessionByTokenHash(tokenHash: string) {
  getDatabase()
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .run(tokenHash);
}

export function deleteSessionsByUserId(userId: string) {
  getDatabase()
    .prepare("DELETE FROM sessions WHERE user_id = ?")
    .run(userId);
}

export function deletePasswordResetTokensByUserId(userId: string) {
  getDatabase()
    .prepare("DELETE FROM password_reset_tokens WHERE user_id = ?")
    .run(userId);
}

export function markPasswordResetTokenAsUsed(tokenId: string) {
  getDatabase()
    .prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE id = ?
    `)
    .run(new Date().toISOString(), tokenId);
}
