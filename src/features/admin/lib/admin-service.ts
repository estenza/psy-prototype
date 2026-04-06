import "server-only";

import { randomBytes } from "node:crypto";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { listAdminUsers } from "@/features/admin/lib/admin-repository";
import type {
  AdminCreateTestUserPayload,
  AdminSpecialistStatusFilter,
  AdminUpdateUserPayload,
  AdminUserRoleFilter,
  AdminUsersFilters,
} from "@/features/admin/types";
import {
  countModerators,
  createUser,
  findUserById,
  findUserByEmail,
  findUserByNickname,
  updateUserAdminFields,
} from "@/features/auth/lib/auth-repository";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/constants";
import { hashPassword } from "@/features/auth/lib/password";
import { buildDisplayName } from "@/features/auth/lib/profile";
import type { SessionUser, SpecialistStatus, UserRole } from "@/features/auth/types";

const TEST_EMAIL_DOMAIN = process.env.ADMIN_TEST_EMAIL_DOMAIN?.trim() || "vnutri.test";
const TEST_SPECIALIST_FIRST_NAMES = [
  "Анна",
  "Елена",
  "Мария",
  "Ирина",
  "София",
  "Дарья",
];
const TEST_SPECIALIST_LAST_NAMES = [
  "Лебедева",
  "Соколова",
  "Орлова",
  "Морозова",
  "Виноградова",
  "Тихонова",
];

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

function generateTestUserPassword() {
  const password = `Vnutri!${randomBytes(4).toString("hex")}`;

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AdminServiceError("Не удалось сгенерировать пароль.", 500);
  }

  return password;
}

async function generateUniqueTestIdentity(role: UserRole) {
  const nicknamePrefix = role === "specialist" ? "spec" : "user";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const nickname = `${nicknamePrefix}${suffix}`;
    const email = `${nickname}@${TEST_EMAIL_DOMAIN}`;

    const [existingUserByEmail, existingUserByNickname] = await Promise.all([
      findUserByEmail(email),
      findUserByNickname(nickname),
    ]);

    if (!existingUserByEmail && !existingUserByNickname) {
      return {
        email,
        nickname,
        suffix,
      };
    }
  }

  throw new AdminServiceError(
    "Не удалось сгенерировать уникальные данные тестового пользователя.",
    500,
  );
}

function pickSpecialistName(suffix: string) {
  const seed = Number.parseInt(suffix.slice(0, 2), 16);

  return {
    firstName: TEST_SPECIALIST_FIRST_NAMES[seed % TEST_SPECIALIST_FIRST_NAMES.length],
    lastName:
      TEST_SPECIALIST_LAST_NAMES[
        (seed + 3) % TEST_SPECIALIST_LAST_NAMES.length
      ],
  };
}

export async function createAdminTestUser(
  actor: SessionUser,
  payload: AdminCreateTestUserPayload,
) {
  if (!canAccessAdminConsole(actor)) {
    throw new AdminServiceError(
      "Недостаточно прав для создания тестовых пользователей.",
      403,
    );
  }

  const role = USER_ROLE_VALUES.has((payload.role ?? "user") as UserRole)
    ? ((payload.role ?? "user") as UserRole)
    : null;

  if (!role) {
    throw new AdminServiceError("Недопустимая роль.", 400);
  }

  const specialistStatus =
    role === "specialist"
      ? SPECIALIST_STATUS_VALUES.has(
            (payload.specialistStatus ?? "verified") as SpecialistStatus,
          )
        ? ((payload.specialistStatus ?? "verified") as SpecialistStatus)
        : null
      : "none";

  if (!specialistStatus) {
    throw new AdminServiceError("Недопустимый specialist status.", 400);
  }

  const identity = await generateUniqueTestIdentity(role);
  const generatedPassword = generateTestUserPassword();
  const passwordHash = await hashPassword(generatedPassword);
  const specialistName =
    role === "specialist" ? pickSpecialistName(identity.suffix) : null;

  const user = await createUser({
    displayName: buildDisplayName({
      email: identity.email,
      firstName: specialistName?.firstName ?? null,
      lastName: specialistName?.lastName ?? null,
      nickname: identity.nickname,
      role,
    }),
    email: identity.email,
    firstName: specialistName?.firstName ?? null,
    lastName: specialistName?.lastName ?? null,
    nickname: identity.nickname,
    onboardingStep: "complete",
    passwordHash,
    role,
    specialistStatus,
  });

  if (!user) {
    throw new AdminServiceError(
      "Не удалось создать тестового пользователя.",
      500,
    );
  }

  return {
    credentials: {
      displayName: user.displayName,
      email: user.email,
      handle: user.nickname ? `@${user.nickname}` : null,
      password: generatedPassword,
      role: user.role,
      specialistStatus: user.specialistStatus,
    },
    user,
  };
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
