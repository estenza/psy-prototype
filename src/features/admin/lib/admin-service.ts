import "server-only";

import { randomUUID } from "node:crypto";

import {
  ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE,
  ADMIN_ACCOUNT_NAME_PATTERN,
  ADMIN_ACCOUNT_NAME_MAX_LENGTH,
  ADMIN_ACCOUNT_NAME_MIN_LENGTH,
  ADMIN_USER_NAME_MAX_LENGTH,
  normalizeAdminAccountName,
} from "@/features/admin/lib/admin-user-fields";
import {
  ADMIN_SPECIALTY_MAX_SELECTED,
  normalizeAdminSpecialties,
} from "@/features/admin/lib/admin-specialties";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import {
  normalizeSpecialistEducation,
  SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH,
  SPECIALIST_EDUCATION_MAX_ITEMS,
  SPECIALIST_EDUCATION_YEAR_MAX_LENGTH,
} from "@/features/auth/lib/education";
import { normalizeSpecialistWorkTopics } from "@/features/specialists/lib/specialist-work-topics";
import {
  normalizeSpecialistPhoneCountry,
  normalizeSpecialistPhoneNumber,
} from "@/features/specialists/lib/specialist-phone";
import { listAdminUsers } from "@/features/admin/lib/admin-repository";
import type {
  AdminBanUserPayload,
  AdminCreateManagedUserPayload,
  AdminManagedUserPayload,
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
  PROFILE_NAME_MAX_LENGTH,
} from "@/features/auth/constants";
import {
  buildDisplayName,
  isReservedProfilePathSegment,
  RESERVED_NICKNAME_MESSAGE,
  sanitizeProfileText,
} from "@/features/auth/lib/profile";
import type {
  SessionUser,
  SpecialistGender,
  SpecialistStatus,
  UserRole,
} from "@/features/auth/types";

const USER_PROFILE_DESCRIPTION_MAX_LENGTH = 250;
const SPECIALIST_PROFILE_DESCRIPTION_MAX_LENGTH = 1500;
const SPECIALIST_CONTACT_URL_MAX_LENGTH = 512;

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
const SPECIALIST_STATUS_MUTATION_VALUES = new Set<SpecialistStatus>([
  "none",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

const USER_ROLE_VALUES = new Set<UserRole>(["user", "specialist"]);
const SPECIALIST_GENDER_VALUES = new Set<SpecialistGender>(["female", "male"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SPECIALIST_BIRTH_DATE_MIN_ISO = "1955-01-01";

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
  const normalizedValue = (value ?? "").replace(/\r\n?/g, "\n").trim();

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

function normalizeRequiredProfileDescription(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalizedValue = normalizeProfileDescription(value, maxLength);

  if (!normalizedValue) {
    throw new AdminServiceError("Заполните описание специалиста.", 400, {
      profileDescription: "Заполните описание.",
    });
  }

  return normalizedValue;
}

function normalizeAdminEducation(value: unknown) {
  const normalizedEducation = normalizeSpecialistEducation(value);

  if (normalizedEducation.length === 0) {
    throw new AdminServiceError("Добавьте образование специалиста.", 400, {
      education: "Добавьте образование.",
    });
  }

  if (normalizedEducation.length > SPECIALIST_EDUCATION_MAX_ITEMS) {
    throw new AdminServiceError(
      `Добавьте не больше ${SPECIALIST_EDUCATION_MAX_ITEMS} записей об образовании.`,
      400,
      {
        education: `Добавьте не больше ${SPECIALIST_EDUCATION_MAX_ITEMS} записей.`,
      },
    );
  }

  for (const item of normalizedEducation) {
    if (!item.year || !item.institution) {
      throw new AdminServiceError("Заполните год и учебное учреждение.", 400, {
        education: "Заполните год и учебное учреждение.",
      });
    }

    if (item.year.length > SPECIALIST_EDUCATION_YEAR_MAX_LENGTH) {
      throw new AdminServiceError(
        `Год должен быть не длиннее ${SPECIALIST_EDUCATION_YEAR_MAX_LENGTH} символов.`,
        400,
        {
          education: `Год должен быть не длиннее ${SPECIALIST_EDUCATION_YEAR_MAX_LENGTH} символов.`,
        },
      );
    }

    if (item.institution.length > SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH) {
      throw new AdminServiceError(
        `Учебное учреждение должно быть не длиннее ${SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH} символов.`,
        400,
        {
          education: `Учебное учреждение должно быть не длиннее ${SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH} символов.`,
        },
      );
    }
  }

  return normalizedEducation;
}

function normalizeAdminManagedSpecialties(value: unknown) {
  const normalizedSpecialties = normalizeAdminSpecialties(
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
  );

  if (normalizedSpecialties.length === 0) {
    throw new AdminServiceError("Выберите хотя бы один подход.", 400, {
      specialties: "Выберите хотя бы один подход.",
    });
  }

  if (normalizedSpecialties.length > ADMIN_SPECIALTY_MAX_SELECTED) {
    throw new AdminServiceError(
      `Выберите не больше ${ADMIN_SPECIALTY_MAX_SELECTED} подходов.`,
      400,
      {
        specialties: `Выберите не больше ${ADMIN_SPECIALTY_MAX_SELECTED} подходов.`,
      },
    );
  }

  return normalizedSpecialties;
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

function normalizeRole(value: string | null | undefined) {
  if (!USER_ROLE_VALUES.has((value ?? "") as UserRole)) {
    throw new AdminServiceError("Недопустимый тип аккаунта.", 400);
  }

  return value as UserRole;
}

function normalizeSpecialistGender(value: unknown) {
  if (value === null || value === undefined || value === "") {
    throw new AdminServiceError("Выберите пол специалиста.", 400, {
      specialistGender: "Выберите пол.",
    });
  }

  if (typeof value !== "string" || !SPECIALIST_GENDER_VALUES.has(value as SpecialistGender)) {
    throw new AdminServiceError("Выберите корректный пол специалиста.", 400, {
      specialistGender: "Выберите корректный пол.",
    });
  }

  return value as SpecialistGender;
}

function normalizeSpecialistBirthDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    throw new AdminServiceError("Выберите дату рождения специалиста.", 400, {
      specialistBirthDate: "Выберите дату рождения.",
    });
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new AdminServiceError("Выберите корректную дату рождения специалиста.", 400, {
      specialistBirthDate: "Выберите корректную дату рождения.",
    });
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime())
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() + 1 !== month
    || parsedDate.getUTCDate() !== day
  ) {
    throw new AdminServiceError("Выберите корректную дату рождения специалиста.", 400, {
      specialistBirthDate: "Выберите корректную дату рождения.",
    });
  }

  const todayIsoDate = new Date().toISOString().slice(0, 10);

  if (value < SPECIALIST_BIRTH_DATE_MIN_ISO) {
    throw new AdminServiceError("Дата рождения не может быть раньше 1955 года.", 400, {
      specialistBirthDate: "Дата рождения не может быть раньше 1955 года.",
    });
  }

  if (value > todayIsoDate) {
    throw new AdminServiceError("Дата рождения не может быть в будущем.", 400, {
      specialistBirthDate: "Дата рождения не может быть в будущем.",
    });
  }

  return value;
}

function normalizeSpecialistPhone(countryValue: unknown, numberValue: unknown) {
  const hasPhoneNumber = typeof numberValue === "string" && numberValue.trim().length > 0;

  if (!hasPhoneNumber) {
    return {
      specialistPhoneCountry: null,
      specialistPhoneNumber: null,
    };
  }

  const country = normalizeSpecialistPhoneCountry(countryValue);

  if (!country) {
    throw new AdminServiceError("Выберите страну телефона специалиста.", 400, {
      specialistPhoneCountry: "Выберите страну.",
    });
  }

  const phoneNumber = normalizeSpecialistPhoneNumber(country, numberValue);

  if (!phoneNumber) {
    throw new AdminServiceError("Укажите корректный телефон специалиста.", 400, {
      specialistPhoneNumber: "Укажите корректный телефон.",
    });
  }

  return {
    specialistPhoneCountry: country,
    specialistPhoneNumber: phoneNumber,
  };
}

function normalizeSpecialistContactUrl(
  value: unknown,
  fieldName: Extract<
    AdminManagedUserFieldErrorName,
    "specialistTelegramUrl" | "specialistMaxUrl" | "specialistWhatsappUrl"
  >,
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > SPECIALIST_CONTACT_URL_MAX_LENGTH) {
    throw new AdminServiceError("Ссылка слишком длинная.", 400, {
      [fieldName]: `Ссылка должна быть не длиннее ${SPECIALIST_CONTACT_URL_MAX_LENGTH} символов.`,
    });
  }

  const valueWithProtocol = /^[a-z][a-z\d+\-.]*:/i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(valueWithProtocol);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return parsedUrl.toString();
  } catch {
    throw new AdminServiceError("Укажите корректную ссылку.", 400, {
      [fieldName]: "Укажите корректную ссылку.",
    });
  }
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
    | "patronymic"
    | "profileDescription"
    | "education"
    | "role"
    | "specialties"
    | "specialistGender"
    | "specialistBirthDate"
    | "specialistPhoneCountry"
    | "specialistPhoneNumber"
    | "specialistTelegramUrl"
    | "specialistMaxUrl"
    | "specialistWhatsappUrl"
    | "workTopics"
  >,
  options: {
    requireProfessionalFields?: boolean;
    requireNickname?: boolean;
    specialistStatus?: SpecialistStatus;
  } = {},
) {
  const requireProfessionalFields = options.requireProfessionalFields ?? true;
  const requireNickname = options.requireNickname ?? true;
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
      patronymic: null,
      nickname,
      profileDescription: normalizeProfileDescription(
        payload.profileDescription,
        USER_PROFILE_DESCRIPTION_MAX_LENGTH,
      ),
      education: [],
      role,
      specialties: [] as string[],
      specialistGender: null,
      specialistBirthDate: null,
      specialistPhoneCountry: null,
      specialistPhoneNumber: null,
      specialistTelegramUrl: null,
      specialistMaxUrl: null,
      specialistWhatsappUrl: null,
      workTopics: [] as string[],
      specialistStatus: "none" as const,
    };
  }

  const firstName = normalizeRequiredName(payload.firstName, "Имя");
  const lastName = normalizeRequiredName(payload.lastName, "Фамилия");
  const patronymic = sanitizeProfileText(payload.patronymic);
  const nickname = requireNickname ? normalizeUserAccountName(payload.nickname) : null;
  const normalizedWorkTopics = normalizeSpecialistWorkTopics(payload.workTopics);
  const normalizedPhone = normalizeSpecialistPhone(
    payload.specialistPhoneCountry,
    payload.specialistPhoneNumber,
  );

  if (patronymic.length > PROFILE_NAME_MAX_LENGTH) {
    throw new AdminServiceError(
      `Отчество должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`,
      400,
      {
        patronymic: `Отчество должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`,
      },
    );
  }

  if (requireProfessionalFields && !avatarUrl) {
    throw new AdminServiceError("Добавьте фото специалиста.", 400, {
      avatarUrl: "Добавьте фото.",
    });
  }

  if (requireProfessionalFields && normalizedWorkTopics.length === 0) {
    throw new AdminServiceError("Выберите хотя бы одну тему.", 400, {
      workTopics: "Выберите хотя бы одну тему.",
    });
  }

  const normalizedSpecialties = requireProfessionalFields
    ? normalizeAdminManagedSpecialties(payload.specialties)
    : normalizeAdminSpecialties(
        Array.isArray(payload.specialties)
          ? payload.specialties.filter((item): item is string => typeof item === "string")
          : [],
      );

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
    patronymic: patronymic || null,
    nickname,
    profileDescription: requireProfessionalFields
      ? normalizeRequiredProfileDescription(
          payload.profileDescription,
          SPECIALIST_PROFILE_DESCRIPTION_MAX_LENGTH,
        )
      : normalizeProfileDescription(
          payload.profileDescription,
          SPECIALIST_PROFILE_DESCRIPTION_MAX_LENGTH,
        ),
    education: requireProfessionalFields
      ? normalizeAdminEducation(payload.education)
      : normalizeSpecialistEducation(payload.education),
    role,
    specialties: normalizedSpecialties,
    specialistGender: normalizeSpecialistGender(payload.specialistGender),
    specialistBirthDate: normalizeSpecialistBirthDate(payload.specialistBirthDate),
    specialistPhoneCountry: normalizedPhone.specialistPhoneCountry,
    specialistPhoneNumber: normalizedPhone.specialistPhoneNumber,
    specialistTelegramUrl: normalizeSpecialistContactUrl(
      payload.specialistTelegramUrl,
      "specialistTelegramUrl",
    ),
    specialistMaxUrl: normalizeSpecialistContactUrl(payload.specialistMaxUrl, "specialistMaxUrl"),
    specialistWhatsappUrl: normalizeSpecialistContactUrl(
      payload.specialistWhatsappUrl,
      "specialistWhatsappUrl",
    ),
    workTopics: normalizedWorkTopics,
    specialistStatus: options.specialistStatus ?? "verified" as const,
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
  const passwordHash = `otp-only:${randomUUID()}`;
  const nickname = normalizedPayload.nickname;

  if (!nickname) {
    throw new AdminServiceError(ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE, 400, {
      nickname: ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE,
    });
  }

  await ensureNicknameAvailable(nickname);

  const user = await createUser({
    avatarCardUrl: normalizedPayload.avatarCardUrl,
    avatarSourceUrl: normalizedPayload.avatarSourceUrl,
    avatarUrl: normalizedPayload.avatarUrl,
    displayName: normalizedPayload.displayName,
    email,
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    patronymic: normalizedPayload.patronymic,
    nickname,
    onboardingStep: "complete",
    passwordHash,
    profileDescription: normalizedPayload.profileDescription,
    education: normalizedPayload.education,
    role: normalizedPayload.role,
    specialties: normalizedPayload.specialties,
    specialistGender: normalizedPayload.specialistGender,
    specialistBirthDate: normalizedPayload.specialistBirthDate,
    specialistPhoneCountry: normalizedPayload.specialistPhoneCountry,
    specialistPhoneNumber: normalizedPayload.specialistPhoneNumber,
    specialistTelegramUrl: normalizedPayload.specialistTelegramUrl,
    specialistMaxUrl: normalizedPayload.specialistMaxUrl,
    specialistWhatsappUrl: normalizedPayload.specialistWhatsappUrl,
    workTopics: normalizedPayload.workTopics,
    specialistStatus: normalizedPayload.specialistStatus,
  });

  if (!user) {
    throw new AdminServiceError("Не удалось создать аккаунт.", 500);
  }

  return user;
}

export async function createSpecialistApplication(
  payload: AdminManagedUserPayload & {
    email?: string;
  },
) {
  const email = normalizeEmail(payload.email);

  if (!EMAIL_PATTERN.test(email)) {
    throw new AdminServiceError("Укажите корректный email.", 400, {
      email: "Укажите корректный email.",
    });
  }

  const normalizedPayload = normalizeManagedPayload(
    {
      ...payload,
      nickname: null,
      role: "specialist",
    },
    {
      requireProfessionalFields: false,
      requireNickname: false,
      specialistStatus: "pending",
    },
  );
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const updatedUser = await updateUserAdminManagedFields({
      avatarCardUrl: normalizedPayload.avatarCardUrl,
      avatarSourceUrl: normalizedPayload.avatarSourceUrl,
      avatarUrl: normalizedPayload.avatarUrl,
      displayName: normalizedPayload.displayName,
      firstName: normalizedPayload.firstName,
      lastName: normalizedPayload.lastName,
      patronymic: normalizedPayload.patronymic,
      onboardingStep: "complete",
      profileDescription: normalizedPayload.profileDescription,
      education: normalizedPayload.education,
      role: "specialist",
      specialties: normalizedPayload.specialties,
      specialistGender: normalizedPayload.specialistGender,
      specialistBirthDate: normalizedPayload.specialistBirthDate,
      specialistPhoneCountry: normalizedPayload.specialistPhoneCountry,
      specialistPhoneNumber: normalizedPayload.specialistPhoneNumber,
      specialistTelegramUrl: normalizedPayload.specialistTelegramUrl,
      specialistMaxUrl: normalizedPayload.specialistMaxUrl,
      specialistWhatsappUrl: normalizedPayload.specialistWhatsappUrl,
      workTopics: normalizedPayload.workTopics,
      specialistStatus: "pending",
      userId: existingUser.id,
    });

    if (!updatedUser) {
      throw new AdminServiceError("Не удалось отправить заявку.", 500);
    }

    return updatedUser;
  }

  const passwordHash = `otp-only:${randomUUID()}`;

  const user = await createUser({
    avatarCardUrl: normalizedPayload.avatarCardUrl,
    avatarSourceUrl: normalizedPayload.avatarSourceUrl,
    avatarUrl: normalizedPayload.avatarUrl,
    displayName: normalizedPayload.displayName,
    email,
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    patronymic: normalizedPayload.patronymic,
    nickname: null,
    onboardingStep: "complete",
    passwordHash,
    profileDescription: normalizedPayload.profileDescription,
    education: normalizedPayload.education,
    role: "specialist",
    specialties: normalizedPayload.specialties,
    specialistGender: normalizedPayload.specialistGender,
    specialistBirthDate: normalizedPayload.specialistBirthDate,
    specialistPhoneCountry: normalizedPayload.specialistPhoneCountry,
    specialistPhoneNumber: normalizedPayload.specialistPhoneNumber,
    specialistTelegramUrl: normalizedPayload.specialistTelegramUrl,
    specialistMaxUrl: normalizedPayload.specialistMaxUrl,
    specialistWhatsappUrl: normalizedPayload.specialistWhatsappUrl,
    workTopics: normalizedPayload.workTopics,
    specialistStatus: "pending",
  });

  if (!user) {
    throw new AdminServiceError("Не удалось отправить заявку.", 500);
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
  const nextNickname = normalizedPayload.nickname;

  if (!nextNickname) {
    throw new AdminServiceError(ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE, 400, {
      nickname: ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE,
    });
  }

  await ensureNicknameAvailable(nextNickname, targetUser.id);

  const updatedUser = await updateUserAdminManagedFields({
    avatarCardUrl: normalizedPayload.avatarCardUrl,
    avatarSourceUrl: normalizedPayload.avatarSourceUrl,
    avatarUrl: normalizedPayload.avatarUrl,
    displayName: normalizedPayload.displayName,
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    patronymic: normalizedPayload.patronymic,
    nickname: nextNickname,
    onboardingStep: "complete",
    profileDescription: normalizedPayload.profileDescription,
    education: normalizedPayload.education,
    role: normalizedPayload.role,
    specialties: normalizedPayload.specialties,
    specialistGender: normalizedPayload.specialistGender,
    specialistBirthDate: normalizedPayload.specialistBirthDate,
    specialistPhoneCountry: normalizedPayload.specialistPhoneCountry,
    specialistPhoneNumber: normalizedPayload.specialistPhoneNumber,
    specialistTelegramUrl: normalizedPayload.specialistTelegramUrl,
    specialistMaxUrl: normalizedPayload.specialistMaxUrl,
    specialistWhatsappUrl: normalizedPayload.specialistWhatsappUrl,
    workTopics: normalizedPayload.workTopics,
    specialistStatus: normalizedPayload.specialistStatus,
    userId,
  });

  if (!updatedUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  return updatedUser;
}

export async function updateAdminSpecialistStatus(
  actor: SessionUser,
  userId: string,
  payload: {
    specialistStatus?: string | null;
  },
) {
  assertAdminActor(actor);

  const targetUser = await findUserById(userId);

  if (!targetUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  if (targetUser.role !== "specialist") {
    throw new AdminServiceError("Статус можно менять только у специалистов.", 400);
  }

  const specialistStatus = payload.specialistStatus as SpecialistStatus | null | undefined;

  if (!specialistStatus || !SPECIALIST_STATUS_MUTATION_VALUES.has(specialistStatus)) {
    throw new AdminServiceError("Выберите корректный статус специалиста.", 400);
  }

  const updatedUser = await updateUserAdminManagedFields({
    specialistStatus,
    userId,
  });

  if (!updatedUser) {
    throw new AdminServiceError("Пользователь не найден.", 404);
  }

  if (specialistStatus !== "verified") {
    await deleteSessionsByUserId(userId);
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
