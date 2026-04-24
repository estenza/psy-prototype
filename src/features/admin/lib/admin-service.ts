import "server-only";

import { randomBytes } from "node:crypto";
import {
  ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE,
  ADMIN_ACCOUNT_NAME_PATTERN,
  ADMIN_ACCOUNT_NAME_MAX_LENGTH,
  ADMIN_ACCOUNT_NAME_MIN_LENGTH,
  ADMIN_USER_NAME_MAX_LENGTH,
  normalizeAdminAccountName,
} from "@/features/admin/lib/admin-user-fields";
import { normalizeAdminSpecialties } from "@/features/admin/lib/admin-specialties";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { listAdminUsers } from "@/features/admin/lib/admin-repository";
import type {
  AdminBanUserPayload,
  AdminCreateManagedUserPayload,
  AdminManagedUserFieldErrorName,
  AdminSpecialistStatusFilter,
  AdminUpdateManagedUserPayload,
  AdminUserRoleFilter,
  AdminUsersFilters,
} from "@/features/admin/types";
import {
  countModerators,
  createUser,
  deletePasswordResetTokensByUserId,
  deleteSessionsByUserId,
  deleteUserById,
  findUserByEmail,
  findUserById,
  findUserByNickname,
  updateUserAdminManagedFields,
} from "@/features/auth/lib/auth-repository";
import {
  EMAIL_PATTERN,
  PASSWORD_MIN_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from "@/features/auth/constants";
import { hashPassword } from "@/features/auth/lib/password";
import {
  buildDisplayName,
  isReservedProfilePathSegment,
  normalizeNickname,
  RESERVED_NICKNAME_MESSAGE,
  sanitizeProfileText,
} from "@/features/auth/lib/profile";
import type { SessionUser, UserRole } from "@/features/auth/types";

const USER_PROFILE_DESCRIPTION_MAX_LENGTH = 250;
const SPECIALIST_PROFILE_DESCRIPTION_MAX_LENGTH = 750;

const ROLE_FILTER_VALUES = new Set<AdminUserRoleFilter>([
  "all",
  "moderator",
  "specialist",
  "user",
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

export class AdminServiceError extends Error {
  fieldErrors?: Partial<Record<AdminManagedUserFieldErrorName, string>>;
  status: number;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Partial<Record<AdminManagedUserFieldErrorName, string>>,
  ) {
    super(message);
    this.name = "AdminServiceError";
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

export function normalizeAdminUsersFilters(input: {
  specialistStatus?: string | null;
  role?: string | null;
}): AdminUsersFilters {
  const nextRole = (input.role ?? "all") as AdminUserRoleFilter;
  const role = ROLE_FILTER_VALUES.has(nextRole)
    ? nextRole
    : "all";
  const nextSpecialistStatus =
    (input.specialistStatus ?? "all") as AdminSpecialistStatusFilter;
  const specialistStatus = SPECIALIST_STATUS_FILTER_VALUES.has(
    nextSpecialistStatus,
  )
    ? nextSpecialistStatus
    : "all";

  return {
    specialistStatus,
    role,
  };
}

export async function getAdminUsers(filters: AdminUsersFilters) {
  return await listAdminUsers(filters);
}

function assertAdminActor(actor: SessionUser) {
  if (!canAccessAdminConsole(actor)) {
    throw new AdminServiceError("Недостаточно прав для управления аккаунтами.", 403);
  }
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeRequiredName(value: string | null | undefined, fieldLabel: string) {
  const normalizedValue = sanitizeProfileText(value);

  if (!normalizedValue) {
    throw new AdminServiceError(`Укажите поле «${fieldLabel}».`, 400);
  }

  if (normalizedValue.length > PROFILE_NAME_MAX_LENGTH) {
    throw new AdminServiceError(
      `Поле «${fieldLabel}» должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`,
      400,
    );
  }

  return normalizedValue;
}

function normalizeProfileDescription(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalizedValue = sanitizeProfileText(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > maxLength) {
    throw new AdminServiceError(
      `Описание должно быть не длиннее ${maxLength} символов.`,
      400,
    );
  }

  return normalizedValue;
}

function normalizeOptionalImage(value: string | null | undefined) {
  const normalizedValue = (value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  if (
    normalizedValue.startsWith("data:image/")
    || normalizedValue.startsWith("http://")
    || normalizedValue.startsWith("https://")
    || normalizedValue.startsWith("/")
  ) {
    return normalizedValue;
  }

  throw new AdminServiceError("Некорректный формат изображения.", 400);
}

function normalizePassword(value: string | null | undefined) {
  const password = value ?? "";

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AdminServiceError(
      `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`,
      400,
    );
  }

  return password;
}

function normalizeUserProfileName(value: string | null | undefined) {
  const normalizedValue = sanitizeProfileText(value);

  if (!normalizedValue) {
    throw new AdminServiceError("Введите имя.", 400, {
      displayName: "Введите имя.",
    });
  }

  if (normalizedValue.length > ADMIN_USER_NAME_MAX_LENGTH) {
    throw new AdminServiceError(
      `Имя должно быть не длиннее ${ADMIN_USER_NAME_MAX_LENGTH} символов.`,
      400,
      {
        displayName: `Имя должно быть не длиннее ${ADMIN_USER_NAME_MAX_LENGTH} символов.`,
      },
    );
  }

  return normalizedValue;
}

function normalizeUserAccountName(value: string | null | undefined) {
  const normalizedValue = normalizeAdminAccountName(value);

  if (!normalizedValue) {
    throw new AdminServiceError("Введите имя аккаунта.", 400, {
      nickname: "Введите имя аккаунта.",
    });
  }

  if (
    normalizedValue.length < ADMIN_ACCOUNT_NAME_MIN_LENGTH
    || normalizedValue.length > ADMIN_ACCOUNT_NAME_MAX_LENGTH
    || !ADMIN_ACCOUNT_NAME_PATTERN.test(normalizedValue)
  ) {
    throw new AdminServiceError(ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE, 400, {
      nickname: ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE,
    });
  }

  if (isReservedProfilePathSegment(normalizedValue)) {
    throw new AdminServiceError(RESERVED_NICKNAME_MESSAGE, 400, {
      nickname: RESERVED_NICKNAME_MESSAGE,
    });
  }

  return normalizedValue;
}

async function ensureEmailAvailable(email: string, currentUserId?: string) {
  const existingUser = await findUserByEmail(email);

  if (existingUser && existingUser.id !== currentUserId) {
    throw new AdminServiceError("Пользователь с таким email уже существует.", 409);
  }
}

async function ensureNicknameAvailable(nickname: string, currentUserId?: string) {
  if (isReservedProfilePathSegment(nickname)) {
    throw new AdminServiceError(RESERVED_NICKNAME_MESSAGE, 409, {
      nickname: RESERVED_NICKNAME_MESSAGE,
    });
  }

  const existingUser = await findUserByNickname(nickname);

  if (existingUser && existingUser.id !== currentUserId) {
    throw new AdminServiceError("Имя аккаунта уже занято.", 409, {
      nickname: "Имя аккаунта уже занято.",
    });
  }
}

async function generateManagedNickname(email: string, currentUserId?: string) {
  const emailLocalPart = email.split("@")[0] ?? "";
  const normalizedBase = normalizeNickname(emailLocalPart.replace(/[^A-Za-zА-Яа-яЁё0-9._]+/gu, "."))
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");

  const safeBase = normalizedBase.length >= 3 ? normalizedBase : "user";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `.${randomBytes(2).toString("hex")}`;
    const candidate = `${safeBase.slice(0, Math.max(3, 20 - suffix.length))}${suffix}`;

    if (isReservedProfilePathSegment(candidate)) {
      continue;
    }

    const existingUser = await findUserByNickname(candidate);

    if (!existingUser || existingUser.id === currentUserId) {
      return candidate;
    }
  }

  throw new AdminServiceError("Не удалось сгенерировать уникальный хэндл аккаунта.", 500);
}

function normalizeRole(value: string | null | undefined) {
  if (!USER_ROLE_VALUES.has((value ?? "") as UserRole)) {
    throw new AdminServiceError("Недопустимый тип аккаунта.", 400);
  }

  return value as UserRole;
}

function normalizeManagedPayload(
  payload: Pick<
    AdminCreateManagedUserPayload | AdminUpdateManagedUserPayload,
    | "avatarCardUrl"
    | "avatarSourceUrl"
    | "avatarUrl"
    | "displayName"
    | "firstName"
    | "lastName"
    | "nickname"
    | "profileDescription"
    | "role"
    | "specialties"
  >,
) {
  const role = normalizeRole(payload.role);
  const avatarSourceUrl = normalizeOptionalImage(payload.avatarSourceUrl);
  const avatarUrl = normalizeOptionalImage(payload.avatarUrl);
  const avatarCardUrl =
    role === "specialist" ? normalizeOptionalImage(payload.avatarCardUrl) : null;

  if (role === "user") {
    const displayName = normalizeUserProfileName(payload.displayName);
    const nickname = normalizeUserAccountName(payload.nickname);

    return {
      avatarCardUrl: null,
      avatarSourceUrl,
      avatarUrl,
      displayName,
      firstName: null,
      lastName: null,
      nickname,
      profileDescription: normalizeProfileDescription(
        payload.profileDescription,
        USER_PROFILE_DESCRIPTION_MAX_LENGTH,
      ),
      role,
      specialties: [] as string[],
      specialistStatus: "none" as const,
    };
  }

  const firstName = normalizeRequiredName(payload.firstName, "Имя");
  const lastName = normalizeRequiredName(payload.lastName, "Фамилия");

  return {
    avatarCardUrl,
    avatarSourceUrl,
    avatarUrl,
    displayName: buildDisplayName({
      firstName,
      lastName,
      role,
    }),
    firstName,
    lastName,
    nickname: undefined,
    profileDescription: normalizeProfileDescription(
      payload.profileDescription,
      SPECIALIST_PROFILE_DESCRIPTION_MAX_LENGTH,
    ),
    role,
    specialties: normalizeAdminSpecialties(payload.specialties),
    specialistStatus: "verified" as const,
  };
}

export async function createAdminManagedUser(
  actor: SessionUser,
  payload: AdminCreateManagedUserPayload,
) {
  assertAdminActor(actor);

  const email = normalizeEmail(payload.email);

  if (!EMAIL_PATTERN.test(email)) {
    throw new AdminServiceError("Укажите корректный email.", 400);
  }

  await ensureEmailAvailable(email);

  const normalizedPayload = normalizeManagedPayload(payload);
  const passwordHash = await hashPassword(normalizePassword(payload.password));
  const nickname = normalizedPayload.role === "user"
    ? normalizedPayload.nickname
    : await generateManagedNickname(email);

  if (normalizedPayload.role === "user") {
    await ensureNicknameAvailable(nickname);
  }

  const user = await createUser({
    avatarCardUrl: normalizedPayload.avatarCardUrl,
    avatarSourceUrl: normalizedPayload.avatarSourceUrl,
    avatarUrl: normalizedPayload.avatarUrl,
    displayName: normalizedPayload.displayName,
    email,
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    nickname,
    onboardingStep: "complete",
    passwordHash,
    profileDescription: normalizedPayload.profileDescription,
    role: normalizedPayload.role,
    specialties: normalizedPayload.specialties,
    specialistStatus: normalizedPayload.specialistStatus,
  });

  if (!user) {
    throw new AdminServiceError("Не удалось создать аккаунт.", 500);
  }

  return user;
}

export async function updateAdminManagedUser(
  actor: SessionUser,
  userId: string,
  payload: AdminUpdateManagedUserPayload,
) {
  assertAdminActor(actor);

  const targetUser = await findUserById(userId);

  if (!targetUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  if (payload.role && payload.role !== targetUser.role) {
    throw new AdminServiceError("Смена типа аккаунта через редактирование пока не поддерживается.", 400);
  }

  const normalizedPayload = normalizeManagedPayload({
    ...payload,
    role: targetUser.role,
  });
  const nextNickname = normalizedPayload.role === "user"
    ? normalizedPayload.nickname
    : targetUser.nickname ?? (await generateManagedNickname(targetUser.email, targetUser.id));

  if (normalizedPayload.role === "user") {
    await ensureNicknameAvailable(nextNickname, targetUser.id);
  }

  const updatedUser = await updateUserAdminManagedFields({
    avatarCardUrl: normalizedPayload.avatarCardUrl,
    avatarSourceUrl: normalizedPayload.avatarSourceUrl,
    avatarUrl: normalizedPayload.avatarUrl,
    displayName: normalizedPayload.displayName,
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    nickname: nextNickname,
    onboardingStep: "complete",
    profileDescription: normalizedPayload.profileDescription,
    role: normalizedPayload.role,
    specialties: normalizedPayload.specialties,
    specialistStatus: normalizedPayload.specialistStatus,
    userId,
  });

  if (!updatedUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  return updatedUser;
}

export async function banAdminManagedUser(
  actor: SessionUser,
  userId: string,
  payload: AdminBanUserPayload,
) {
  assertAdminActor(actor);

  if (actor.id === userId) {
    throw new AdminServiceError("Нельзя заблокировать собственный аккаунт администратора.", 409);
  }

  const targetUser = await findUserById(userId);

  if (!targetUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  if (targetUser.isModerator && (await countModerators()) <= 1) {
    throw new AdminServiceError("Нельзя заблокировать последнего модератора.", 409);
  }

  const updatedUser = await updateUserAdminManagedFields({
    banReason: sanitizeProfileText(payload.reason) || null,
    isBanned: true,
    userId,
  });

  await deleteSessionsByUserId(userId);

  if (!updatedUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  return updatedUser;
}

export async function deleteAdminManagedUser(
  actor: SessionUser,
  userId: string,
) {
  assertAdminActor(actor);

  if (actor.id === userId) {
    throw new AdminServiceError("Нельзя удалить собственный аккаунт администратора.", 409);
  }

  const targetUser = await findUserById(userId);

  if (!targetUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  if (targetUser.isModerator && (await countModerators()) <= 1) {
    throw new AdminServiceError("Нельзя удалить последнего модератора.", 409);
  }

  await deleteSessionsByUserId(userId);
  await deletePasswordResetTokensByUserId(userId);
  await deleteUserById(userId);
}
