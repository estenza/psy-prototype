import "server-only";

import { randomBytes } from "node:crypto";
import {
  createSession,
  createPasswordResetToken,
  createUser,
  deleteExpiredPasswordResetTokens,
  deleteExpiredSessions,
  deletePasswordResetTokensByUserId,
  deleteSessionByTokenHash,
  deleteSessionsByUserId,
  deleteUserById,
  findSessionWithUserByTokenHash,
  findPasswordResetTokenWithUserByTokenHash,
  findUserByDisplayName,
  findUserByEmail,
  findUserByNickname,
  findUserWithPasswordByEmail,
  updateUserPasswordHash,
  updateUserProfileFields,
} from "@/features/auth/lib/auth-repository";
import { sendPasswordResetEmail } from "@/features/auth/lib/auth-email";
import {
  isBootstrapModeratorEmail,
  syncBootstrapModeratorGrant,
} from "@/features/auth/lib/bootstrap-moderator";
import {
  EMAIL_PATTERN,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  PASSWORD_MIN_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from "@/features/auth/constants";
import {
  buildPasswordResetExpiresAt,
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/features/auth/lib/password-reset-token";
import {
  buildDisplayName,
  isReservedProfilePathSegment,
  normalizeNickname,
  RESERVED_NICKNAME_MESSAGE,
  sanitizeProfileText,
} from "@/features/auth/lib/profile";
import { hashPassword, verifyPassword } from "@/features/auth/lib/password";
import {
  buildSessionExpiresAt,
  generateSessionToken,
  hashSessionToken,
} from "@/features/auth/lib/session";
import type {
  AuthFieldErrorName,
  CompleteSpecialistProfileInput,
  CompleteUserProfileInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  SelectRoleInput,
  SessionUser,
  SignInInput,
  SignUpInput,
} from "@/features/auth/types";

const PROFILE_COVER_DATA_URL_MAX_LENGTH = 2_500_000;
const PROFILE_COVER_DATA_URL_PATTERN = /^data:image\/(?:jpeg|png);base64,/;
const PROFILE_IMAGE_SOURCE_DATA_URL_MAX_LENGTH = 14_000_000;
const USER_PROFILE_DESCRIPTION_MAX_LENGTH = 150;

export class AuthServiceError extends Error {
  status: number;
  fieldErrors?: Partial<Record<AuthFieldErrorName, string>>;

  constructor({
    message,
    status,
    fieldErrors,
  }: {
    message: string;
    status: number;
    fieldErrors?: Partial<Record<AuthFieldErrorName, string>>;
  }) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type GrammaticalGender = "masculine" | "feminine" | "neuter";

const colorAdjectives: Array<Record<GrammaticalGender, string>> = [
  { masculine: "огненный", feminine: "огненная", neuter: "огненное" },
  { masculine: "голубой", feminine: "голубая", neuter: "голубое" },
  { masculine: "пыльно-голубой", feminine: "пыльно-голубая", neuter: "пыльно-голубое" },
  { masculine: "бордовый", feminine: "бордовая", neuter: "бордовое" },
  { masculine: "синий", feminine: "синяя", neuter: "синее" },
  { masculine: "изумрудный", feminine: "изумрудная", neuter: "изумрудное" },
  { masculine: "персиковый", feminine: "персиковая", neuter: "персиковое" },
  { masculine: "бархатный", feminine: "бархатная", neuter: "бархатное" },
  { masculine: "туманно-голубой", feminine: "туманно-голубая", neuter: "туманно-голубое" },
  { masculine: "вишневый", feminine: "вишневая", neuter: "вишневое" },
  { masculine: "ледяной", feminine: "ледяная", neuter: "ледяное" },
  { masculine: "глубокий синий", feminine: "глубокая синяя", neuter: "глубокое синее" },
  { masculine: "холодный белый", feminine: "холодная белая", neuter: "холодное белое" },
  { masculine: "терракотовый", feminine: "терракотовая", neuter: "терракотовое" },
  { masculine: "глубокий бордовый", feminine: "глубокая бордовая", neuter: "глубокое бордовое" },
  { masculine: "коричневый", feminine: "коричневая", neuter: "коричневое" },
  { masculine: "золотой", feminine: "золотая", neuter: "золотое" },
  { masculine: "пастельно-зеленый", feminine: "пастельно-зеленая", neuter: "пастельно-зеленое" },
  { masculine: "пурпурный", feminine: "пурпурная", neuter: "пурпурное" },
  { masculine: "серо-зеленый", feminine: "серо-зеленая", neuter: "серо-зеленое" },
  { masculine: "мерцающий", feminine: "мерцающая", neuter: "мерцающее" },
  { masculine: "серебристый", feminine: "серебристая", neuter: "серебристое" },
  { masculine: "молочный", feminine: "молочная", neuter: "молочное" },
  { masculine: "дымчатый", feminine: "дымчатая", neuter: "дымчатое" },
  { masculine: "лиловый", feminine: "лиловая", neuter: "лиловое" },
  { masculine: "медовый", feminine: "медовая", neuter: "медовое" },
  { masculine: "янтарный", feminine: "янтарная", neuter: "янтарное" },
  { masculine: "оливковый", feminine: "оливковая", neuter: "оливковое" },
  { masculine: "мятный", feminine: "мятная", neuter: "мятное" },
  { masculine: "лазурный", feminine: "лазурная", neuter: "лазурное" },
  { masculine: "аквамариновый", feminine: "аквамариновая", neuter: "аквамариновое" },
  { masculine: "ультрамариновый", feminine: "ультрамариновая", neuter: "ультрамариновое" },
  { masculine: "сливовый", feminine: "сливовая", neuter: "сливовое" },
  { masculine: "гранатовый", feminine: "гранатовая", neuter: "гранатовое" },
  { masculine: "малиновый", feminine: "малиновая", neuter: "малиновое" },
  { masculine: "коралловый", feminine: "коралловая", neuter: "коралловое" },
  { masculine: "розовый", feminine: "розовая", neuter: "розовое" },
  { masculine: "пудровый", feminine: "пудровая", neuter: "пудровое" },
  { masculine: "сиреневый", feminine: "сиреневая", neuter: "сиреневое" },
  { masculine: "фиалковый", feminine: "фиалковая", neuter: "фиалковое" },
  { masculine: "небесный", feminine: "небесная", neuter: "небесное" },
  { masculine: "штормовой", feminine: "штормовая", neuter: "штормовое" },
  { masculine: "сумеречный", feminine: "сумеречная", neuter: "сумеречное" },
  { masculine: "лунный", feminine: "лунная", neuter: "лунное" },
  { masculine: "солнечный", feminine: "солнечная", neuter: "солнечное" },
  { masculine: "апельсиновый", feminine: "апельсиновая", neuter: "апельсиновое" },
  { masculine: "шафрановый", feminine: "шафрановая", neuter: "шафрановое" },
  { masculine: "малахитовый", feminine: "малахитовая", neuter: "малахитовое" },
  { masculine: "нефритовый", feminine: "нефритовая", neuter: "нефритовое" },
  { masculine: "черничный", feminine: "черничная", neuter: "черничное" },
];

const plantNames: Array<{
  gender: GrammaticalGender;
  name: string;
}> = [
  { name: "терн", gender: "masculine" },
  { name: "персик", gender: "masculine" },
  { name: "дельфиниум", gender: "masculine" },
  { name: "шалфей", gender: "masculine" },
  { name: "лотос", gender: "masculine" },
  { name: "лютик", gender: "masculine" },
  { name: "молочай", gender: "masculine" },
  { name: "одуванчик", gender: "masculine" },
  { name: "мятлик", gender: "masculine" },
  { name: "подснежник", gender: "masculine" },
  { name: "золотарник", gender: "masculine" },
  { name: "вереск", gender: "masculine" },
  { name: "барвинок", gender: "masculine" },
  { name: "ирис", gender: "masculine" },
  { name: "пион", gender: "masculine" },
  { name: "василек", gender: "masculine" },
  { name: "клевер", gender: "masculine" },
  { name: "кипарис", gender: "masculine" },
  { name: "можжевельник", gender: "masculine" },
  { name: "чабрец", gender: "masculine" },
  { name: "ель", gender: "feminine" },
  { name: "гортензия", gender: "feminine" },
  { name: "ива", gender: "feminine" },
  { name: "клюква", gender: "feminine" },
  { name: "эхинацея", gender: "feminine" },
  { name: "вишня", gender: "feminine" },
  { name: "медуница", gender: "feminine" },
  { name: "череда", gender: "feminine" },
  { name: "лаванда", gender: "feminine" },
  { name: "ромашка", gender: "feminine" },
  { name: "роза", gender: "feminine" },
  { name: "магнолия", gender: "feminine" },
  { name: "астра", gender: "feminine" },
  { name: "незабудка", gender: "feminine" },
  { name: "фиалка", gender: "feminine" },
  { name: "мята", gender: "feminine" },
  { name: "полынь", gender: "feminine" },
  { name: "рябина", gender: "feminine" },
  { name: "малина", gender: "feminine" },
  { name: "смородина", gender: "feminine" },
  { name: "алоэ", gender: "neuter" },
  { name: "каланхоэ", gender: "neuter" },
  { name: "тысячелистное", gender: "neuter" },
  { name: "первоцветное", gender: "neuter" },
  { name: "василистниковое", gender: "neuter" },
  { name: "миртовое", gender: "neuter" },
  { name: "брусничное", gender: "neuter" },
  { name: "вербеновое", gender: "neuter" },
  { name: "злаковое", gender: "neuter" },
  { name: "камнеломковое", gender: "neuter" },
];

function capitalizeCodeNamePart(value: string) {
  return value
    .split(" ")
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : word)
    .join(" ");
}

function randomIndex(length: number) {
  return randomBytes(4).readUInt32BE(0) % length;
}

async function generateUserCodeName(currentUserId?: string) {
  const totalCombinations = colorAdjectives.length * plantNames.length;

  for (let attempt = 0; attempt < totalCombinations; attempt += 1) {
    const adjective = colorAdjectives[randomIndex(colorAdjectives.length)];
    const plant = plantNames[randomIndex(plantNames.length)];
    const candidate = `${capitalizeCodeNamePart(adjective[plant.gender])} ${capitalizeCodeNamePart(plant.name)}`;
    const existingUser = await findUserByDisplayName(candidate);

    if (!existingUser || existingUser.id === currentUserId) {
      return candidate;
    }
  }

  throw new AuthServiceError({
    message: "Не удалось сгенерировать кодовое имя.",
    status: 500,
  });
}

function validateSignUpInput(input: SignUpInput) {
  const email = normalizeEmail(input.email);
  const password = input.password ?? "";
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Укажите корректный email.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте поля формы.",
      status: 400,
      fieldErrors,
    });
  }

  return {
    email,
    password,
  };
}

function validateSignInInput(input: SignInInput) {
  const email = normalizeEmail(input.email);
  const password = input.password ?? "";
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Укажите корректный email.";
  }

  if (!password) {
    fieldErrors.password = "Введите пароль.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте поля формы.",
      status: 400,
      fieldErrors,
    });
  }

  return {
    email,
    password,
  };
}

function validatePasswordResetRequestInput(input: PasswordResetRequestInput) {
  const email = normalizeEmail(input.email);
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Укажите корректный email.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте поля формы.",
      status: 400,
      fieldErrors,
    });
  }

  return {
    email,
  };
}

function validatePasswordResetConfirmInput(input: PasswordResetConfirmInput) {
  const token = input.token.trim();
  const password = input.password ?? "";
  const passwordConfirmation = input.passwordConfirmation ?? "";
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!token) {
    fieldErrors.token = "Ссылка для восстановления недействительна.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`;
  }

  if (!passwordConfirmation) {
    fieldErrors.passwordConfirmation = "Повторите новый пароль.";
  } else if (password !== passwordConfirmation) {
    fieldErrors.passwordConfirmation = "Пароли не совпадают.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте поля формы.",
      status: 400,
      fieldErrors,
    });
  }

  return {
    password,
    token,
  };
}

function validateRoleSelection(input: SelectRoleInput) {
  if (input.role !== "user" && input.role !== "specialist") {
    throw new AuthServiceError({
      message: "Выберите роль, чтобы продолжить.",
      status: 400,
      fieldErrors: {
        role: "Выберите один из вариантов.",
      },
    });
  }

  return input.role;
}

async function generateUserNickname(_email?: string, currentUserId?: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const numericSuffix = String(randomBytes(4).readUInt32BE(0) % 100000).padStart(5, "0");
    const candidate = `user${numericSuffix}`;

    if (!NICKNAME_PATTERN.test(candidate) || isReservedProfilePathSegment(candidate)) {
      continue;
    }

    const existingUser = await findUserByNickname(candidate);

    if (!existingUser || existingUser.id === currentUserId) {
      return candidate;
    }
  }

  throw new AuthServiceError({
    message: "Не удалось сгенерировать имя аккаунта.",
    status: 500,
  });
}

export async function ensureUserProfileIdentity(user: SessionUser) {
  const displayName = sanitizeProfileText(user.displayName)
    || buildDisplayName({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      role: user.role,
    });
  const nickname = normalizeNickname(user.nickname) || await generateUserNickname(user.email, user.id);

  if (displayName === user.displayName && nickname === user.nickname) {
    return user;
  }

  return await updateUserProfileFields({
    displayName,
    nickname,
    userId: user.id,
  }) ?? user;
}

export async function buildDefaultUserNickname(email: string) {
  return generateUserNickname(email);
}

export async function buildDefaultUserDisplayName(currentUserId?: string) {
  return generateUserCodeName(currentUserId);
}

function validateUserProfileDisplayName(displayName: string) {
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (displayName.length > PROFILE_NAME_MAX_LENGTH) {
    fieldErrors.nickname = `Имя должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте имя.",
      status: 400,
      fieldErrors,
    });
  }

  return displayName;
}

function normalizeOwnProfileDisplayName(value: unknown) {
  const displayName = sanitizeProfileText(typeof value === "string" ? value : "");
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!displayName) {
    fieldErrors.displayName = "Укажите имя.";
  } else if (displayName.length > PROFILE_NAME_MAX_LENGTH) {
    fieldErrors.displayName = `Имя должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте имя.",
      status: 400,
      fieldErrors,
    });
  }

  return displayName;
}

function normalizeUserProfileDescription(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AuthServiceError({
      message: "Не удалось сохранить описание профиля.",
      status: 400,
    });
  }

  const normalizedValue = value.replace(/\r\n?/g, "\n").trim();

  if (normalizedValue.length > USER_PROFILE_DESCRIPTION_MAX_LENGTH) {
    throw new AuthServiceError({
      message: "Описание должно быть не длиннее 150 символов.",
      status: 400,
      fieldErrors: {
        profileDescription: "Описание должно быть не длиннее 150 символов.",
      },
    });
  }

  return normalizedValue || null;
}

function normalizeProfileCoverUrl(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AuthServiceError({
      message: "Не удалось сохранить обложку профиля.",
      status: 400,
    });
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (
    normalizedValue.length > PROFILE_COVER_DATA_URL_MAX_LENGTH
    || !PROFILE_COVER_DATA_URL_PATTERN.test(normalizedValue)
  ) {
    throw new AuthServiceError({
      message: "Загрузите JPG или PNG до 10 МБ.",
      status: 400,
    });
  }

  return normalizedValue;
}

function normalizeProfileImageDataUrl(
  value: unknown,
  {
    maxLength = PROFILE_COVER_DATA_URL_MAX_LENGTH,
    message = "Загрузите JPG или PNG до 10 МБ.",
  }: {
    maxLength?: number;
    message?: string;
  } = {},
) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AuthServiceError({
      message: "Не удалось сохранить изображение профиля.",
      status: 400,
    });
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (
    normalizedValue.length > maxLength
    || !PROFILE_COVER_DATA_URL_PATTERN.test(normalizedValue)
  ) {
    throw new AuthServiceError({
      message,
      status: 400,
    });
  }

  return normalizedValue;
}

function validateSpecialistProfileInput(input: CompleteSpecialistProfileInput) {
  const firstName = sanitizeProfileText(input.firstName);
  const lastName = sanitizeProfileText(input.lastName);
  const patronymic = sanitizeProfileText(input.patronymic);
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (!firstName) {
    fieldErrors.firstName = "Укажите имя, чтобы профиль был понятен пользователям.";
  } else if (firstName.length > PROFILE_NAME_MAX_LENGTH) {
    fieldErrors.firstName = `Имя должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
  }

  if (!lastName) {
    fieldErrors.lastName = "Укажите фамилию, чтобы профиль выглядел профессионально.";
  } else if (lastName.length > PROFILE_NAME_MAX_LENGTH) {
    fieldErrors.lastName = `Фамилия должна быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
  }

  if (patronymic.length > PROFILE_NAME_MAX_LENGTH) {
    fieldErrors.patronymic = `Отчество должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте данные профиля.",
      status: 400,
      fieldErrors,
    });
  }

  return {
    firstName,
    lastName,
    patronymic: patronymic || null,
    specialistPhoneCountry: null,
    specialistPhoneNumber: null,
  };
}

async function createSessionForUser(userId: string) {
  await deleteExpiredSessions();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiresAt();
  const session = await createSession({
    expiresAt,
    tokenHash,
    userId,
  });

  if (!session) {
    throw new AuthServiceError({
      message: "Не удалось создать сессию.",
      status: 500,
    });
  }

  return {
    expiresAt,
    token,
  };
}

function assertUserNotBanned(user: SessionUser) {
  if (!user.isBanned) {
    return;
  }

  throw new AuthServiceError({
    message: "Аккаунт заблокирован.",
    status: 403,
  });
}

export async function checkNicknameAvailability(rawNickname: string) {
  const nickname = normalizeNickname(rawNickname);

  if (!nickname) {
    return {
      available: false,
      normalizedNickname: null,
      reason: "Введите никнейм.",
    };
  }

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return {
      available: false,
      normalizedNickname: nickname,
      reason: "Слишком короткий",
    };
  }

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      available: false,
      normalizedNickname: nickname,
      reason: "Слишком длинный",
    };
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return {
      available: false,
      normalizedNickname: nickname,
      reason: "Недопустимые символы",
    };
  }

  if (isReservedProfilePathSegment(nickname)) {
    return {
      available: false,
      normalizedNickname: nickname,
      reason: RESERVED_NICKNAME_MESSAGE,
    };
  }

  const existingUser = await findUserByNickname(nickname);

  return {
    available: !existingUser,
    normalizedNickname: nickname,
    reason: existingUser ? "Ник уже занят" : undefined,
  };
}

export async function signUp(input: SignUpInput) {
  const normalizedInput = validateSignUpInput(input);

  if (await findUserByEmail(normalizedInput.email)) {
    throw new AuthServiceError({
      message: "Пользователь с таким email уже существует.",
      status: 409,
      fieldErrors: {
        email: "Этот email уже занят.",
      },
    });
  }

  const passwordHash = await hashPassword(normalizedInput.password);
  const nickname = await generateUserNickname(normalizedInput.email);
  const user = await createUser({
    displayName: buildDisplayName({
      email: normalizedInput.email,
      role: "user",
    }),
    email: normalizedInput.email,
    isModerator: isBootstrapModeratorEmail(normalizedInput.email),
    nickname,
    onboardingStep: "role",
    passwordHash,
    role: "user",
  });

  if (!user) {
    throw new AuthServiceError({
      message: "Не удалось создать пользователя.",
      status: 500,
    });
  }

  const resolvedUser = await syncBootstrapModeratorGrant(user);
  const session = await createSessionForUser(resolvedUser.id);

  return {
    expiresAt: session.expiresAt,
    sessionToken: session.token,
    user: resolvedUser,
  };
}

export async function signIn(input: SignInInput) {
  const normalizedInput = validateSignInInput(input);
  const account = await findUserWithPasswordByEmail(normalizedInput.email);

  if (!account) {
    throw new AuthServiceError({
      message: "Неверный email или пароль.",
      status: 401,
    });
  }

  const isPasswordValid = await verifyPassword(
    normalizedInput.password,
    account.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AuthServiceError({
      message: "Неверный email или пароль.",
      status: 401,
    });
  }

  const resolvedUser = await syncBootstrapModeratorGrant(account.user);
  assertUserNotBanned(resolvedUser);
  const session = await createSessionForUser(resolvedUser.id);

  return {
    expiresAt: session.expiresAt,
    sessionToken: session.token,
    user: resolvedUser,
  };
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  { origin }: { origin?: string } = {},
) {
  const normalizedInput = validatePasswordResetRequestInput(input);
  const successMessage =
    "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для восстановления.";

  await deleteExpiredPasswordResetTokens();

  const user = await findUserByEmail(normalizedInput.email);

  if (!user) {
    return {
      message: successMessage,
    };
  }

  await deletePasswordResetTokensByUserId(user.id);

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = buildPasswordResetExpiresAt();

  await createPasswordResetToken({
    expiresAt,
    tokenHash,
    userId: user.id,
  });

  try {
    const emailResult = await sendPasswordResetEmail({
      expiresAt,
      resetUrl: buildPasswordResetUrl({
        origin,
        token: rawToken,
      }),
      toEmail: user.email,
    });

    return {
      debugResetUrl: emailResult.debugResetUrl,
      message: successMessage,
    };
  } catch (error) {
    console.error("[auth/password-reset/request]", error);

    throw new AuthServiceError({
      message: "Не удалось отправить письмо для восстановления. Попробуйте ещё раз позже.",
      status: 500,
    });
  }
}

export async function isPasswordResetTokenValid(rawToken: string) {
  const token = rawToken.trim();

  if (!token) {
    return false;
  }

  await deleteExpiredPasswordResetTokens();

  return Boolean(
    await findPasswordResetTokenWithUserByTokenHash(hashPasswordResetToken(token)),
  );
}

export async function resetPassword(input: PasswordResetConfirmInput) {
  const normalizedInput = validatePasswordResetConfirmInput(input);

  await deleteExpiredPasswordResetTokens();

  const resetToken = await findPasswordResetTokenWithUserByTokenHash(
    hashPasswordResetToken(normalizedInput.token),
  );

  if (!resetToken) {
    throw new AuthServiceError({
      message: "Ссылка для восстановления недействительна или уже истекла.",
      status: 400,
      fieldErrors: {
        token: "Запросите новую ссылку для восстановления.",
      },
    });
  }

  const passwordHash = await hashPassword(normalizedInput.password);
  const updatedUser = await updateUserPasswordHash({
    passwordHash,
    userId: resetToken.user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  await deletePasswordResetTokensByUserId(resetToken.user.id);
  await deleteSessionsByUserId(resetToken.user.id);

  return {
    message: "Пароль обновлён. Теперь можно войти с новым паролем.",
  };
}

export async function selectRole(user: SessionUser, input: SelectRoleInput) {
  const role = validateRoleSelection(input);

  if (role === "specialist") {
    throw new AuthServiceError({
      message: "Регистрация психолога доступна только после проверки заявки.",
      status: 403,
      fieldErrors: {
        role: "Сначала заполните заявку в разделе «Специалистам».",
      },
    });
  }

  const nextOnboardingStep = "user-profile";
  const displayName = await generateUserCodeName(user.id);

  const updatedUser = await updateUserProfileFields({
    displayName,
    onboardingStep: nextOnboardingStep,
    role,
    userId: user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  return await syncBootstrapModeratorGrant(updatedUser);
}

export async function completeUserProfile(user: SessionUser, input: CompleteUserProfileInput) {
  const displayName = validateUserProfileDisplayName(
    sanitizeProfileText(input.displayName ?? input.nickname)
      || await generateUserCodeName(user.id),
  );
  const nickname = normalizeNickname(user.nickname) || await generateUserNickname(user.email, user.id);

  const updatedUser = await updateUserProfileFields({
    displayName,
    nickname,
    onboardingStep: "complete",
    role: "user",
    userId: user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  return await syncBootstrapModeratorGrant(updatedUser);
}

export async function completeSpecialistProfile(
  user: SessionUser,
  input: CompleteSpecialistProfileInput,
) {
  const normalizedInput = validateSpecialistProfileInput(input);
  const updatedUser = await updateUserProfileFields({
    displayName: buildDisplayName({
      email: user.email,
      firstName: normalizedInput.firstName,
      lastName: normalizedInput.lastName,
      role: "specialist",
    }),
    firstName: normalizedInput.firstName,
    lastName: normalizedInput.lastName,
    onboardingStep: "complete",
    patronymic: normalizedInput.patronymic,
    role: "specialist",
    specialistPhoneCountry: normalizedInput.specialistPhoneCountry,
    specialistPhoneNumber: normalizedInput.specialistPhoneNumber,
    userId: user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  return await syncBootstrapModeratorGrant(updatedUser);
}

export async function updateOwnProfile(
  user: SessionUser,
  input: {
    avatarSourceUrl?: unknown;
    avatarUrl?: unknown;
    displayName?: unknown;
    profileCoverUrl?: unknown;
    profileDescription?: unknown;
  },
) {
  const updatedUser = await updateUserProfileFields({
    ...(Object.hasOwn(input, "avatarUrl")
      ? { avatarUrl: normalizeProfileImageDataUrl(input.avatarUrl) }
      : {}),
    ...(Object.hasOwn(input, "avatarSourceUrl")
      ? {
          avatarSourceUrl: normalizeProfileImageDataUrl(input.avatarSourceUrl, {
            maxLength: PROFILE_IMAGE_SOURCE_DATA_URL_MAX_LENGTH,
          }),
        }
      : {}),
    ...(Object.hasOwn(input, "displayName")
      ? {
          displayName: normalizeOwnProfileDisplayName(input.displayName),
        }
      : {}),
    ...(Object.hasOwn(input, "profileCoverUrl")
      ? { profileCoverUrl: normalizeProfileCoverUrl(input.profileCoverUrl) }
      : {}),
    ...(Object.hasOwn(input, "profileDescription")
      ? { profileDescription: normalizeUserProfileDescription(input.profileDescription) }
      : {}),
    userId: user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  return await syncBootstrapModeratorGrant(updatedUser);
}

async function completeSkippableUserOnboarding(user: SessionUser) {
  if (user.role !== "user" || user.onboardingStep !== "user-profile") {
    return ensureUserProfileIdentity(user);
  }

  const userWithIdentity = await ensureUserProfileIdentity(user);
  const updatedUser = await updateUserProfileFields({
    onboardingStep: "complete",
    role: "user",
    userId: userWithIdentity.id,
  });

  return updatedUser ?? userWithIdentity;
}

export async function getCurrentUserBySessionToken(
  sessionToken: string,
  {
    completeSkippableUserOnboarding: shouldCompleteSkippableUserOnboarding = true,
  }: {
    completeSkippableUserOnboarding?: boolean;
  } = {},
): Promise<SessionUser | null> {
  const session = await findSessionWithUserByTokenHash(hashSessionToken(sessionToken));

  if (!session) {
    return null;
  }

  if (session.user.isBanned) {
    await deleteSessionsByUserId(session.user.id);
    return null;
  }

  const userWithIdentity = await ensureUserProfileIdentity(session.user);
  const user = shouldCompleteSkippableUserOnboarding
    ? await completeSkippableUserOnboarding(userWithIdentity)
    : userWithIdentity;

  return await syncBootstrapModeratorGrant(user);
}

export async function deleteSessionByToken(sessionToken: string) {
  await deleteSessionByTokenHash(hashSessionToken(sessionToken));
}

export async function deleteOwnAccount(user: SessionUser) {
  await deleteSessionsByUserId(user.id);
  await deletePasswordResetTokensByUserId(user.id);
  await deleteUserById(user.id);
}
