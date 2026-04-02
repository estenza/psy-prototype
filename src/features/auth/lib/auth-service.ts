import "server-only";

import {
  createSession,
  createPasswordResetToken,
  createUser,
  deleteExpiredPasswordResetTokens,
  deleteExpiredSessions,
  deletePasswordResetTokensByUserId,
  deleteSessionByTokenHash,
  deleteSessionsByUserId,
  findSessionWithUserByTokenHash,
  findPasswordResetTokenWithUserByTokenHash,
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
  normalizeNickname,
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

function validateNicknameInput(input: CompleteUserProfileInput) {
  const nickname = normalizeNickname(input.nickname);
  const fieldErrors: Partial<Record<AuthFieldErrorName, string>> = {};

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    fieldErrors.nickname = "Слишком короткий.";
  } else if (nickname.length > NICKNAME_MAX_LENGTH) {
    fieldErrors.nickname = `Ник должен быть не длиннее ${NICKNAME_MAX_LENGTH} символов.`;
  } else if (!NICKNAME_PATTERN.test(nickname)) {
    fieldErrors.nickname = "Недопустимые символы.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AuthServiceError({
      message: "Проверьте никнейм.",
      status: 400,
      fieldErrors,
    });
  }

  return nickname;
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
  };
}

function createSessionForUser(userId: string) {
  deleteExpiredSessions();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiresAt();
  const session = createSession({
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

export function checkNicknameAvailability(rawNickname: string) {
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

  return {
    available: !findUserByNickname(nickname),
    normalizedNickname: nickname,
    reason: findUserByNickname(nickname) ? "Ник уже занят" : undefined,
  };
}

export async function signUp(input: SignUpInput) {
  const normalizedInput = validateSignUpInput(input);

  if (findUserByEmail(normalizedInput.email)) {
    throw new AuthServiceError({
      message: "Пользователь с таким email уже существует.",
      status: 409,
      fieldErrors: {
        email: "Этот email уже занят.",
      },
    });
  }

  const passwordHash = await hashPassword(normalizedInput.password);
  const user = createUser({
    displayName: buildDisplayName({
      email: normalizedInput.email,
      role: "user",
    }),
    email: normalizedInput.email,
    isModerator: isBootstrapModeratorEmail(normalizedInput.email),
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

  const resolvedUser = syncBootstrapModeratorGrant(user);
  const session = createSessionForUser(resolvedUser.id);

  return {
    expiresAt: session.expiresAt,
    sessionToken: session.token,
    user: resolvedUser,
  };
}

export async function signIn(input: SignInInput) {
  const normalizedInput = validateSignInInput(input);
  const account = findUserWithPasswordByEmail(normalizedInput.email);

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

  const resolvedUser = syncBootstrapModeratorGrant(account.user);
  const session = createSessionForUser(resolvedUser.id);

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

  deleteExpiredPasswordResetTokens();

  const user = findUserByEmail(normalizedInput.email);

  if (!user) {
    return {
      message: successMessage,
    };
  }

  deletePasswordResetTokensByUserId(user.id);

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = buildPasswordResetExpiresAt();

  createPasswordResetToken({
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

export function isPasswordResetTokenValid(rawToken: string) {
  const token = rawToken.trim();

  if (!token) {
    return false;
  }

  deleteExpiredPasswordResetTokens();

  return Boolean(findPasswordResetTokenWithUserByTokenHash(hashPasswordResetToken(token)));
}

export async function resetPassword(input: PasswordResetConfirmInput) {
  const normalizedInput = validatePasswordResetConfirmInput(input);

  deleteExpiredPasswordResetTokens();

  const resetToken = findPasswordResetTokenWithUserByTokenHash(
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
  const updatedUser = updateUserPasswordHash({
    passwordHash,
    userId: resetToken.user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  deletePasswordResetTokensByUserId(resetToken.user.id);
  deleteSessionsByUserId(resetToken.user.id);

  return {
    message: "Пароль обновлён. Теперь можно войти с новым паролем.",
  };
}

export function selectRole(user: SessionUser, input: SelectRoleInput) {
  const role = validateRoleSelection(input);
  const nextOnboardingStep = role === "specialist" ? "specialist-profile" : "user-profile";

  const updatedUser = updateUserProfileFields({
    displayName: buildDisplayName({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      role,
    }),
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

  return syncBootstrapModeratorGrant(updatedUser);
}

export function completeUserProfile(user: SessionUser, input: CompleteUserProfileInput) {
  const nickname = validateNicknameInput(input);
  const existingUser = findUserByNickname(nickname);

  if (existingUser && existingUser.id !== user.id) {
    throw new AuthServiceError({
      message: "Ник уже занят.",
      status: 409,
      fieldErrors: {
        nickname: "Ник уже занят.",
      },
    });
  }

  const updatedUser = updateUserProfileFields({
    displayName: buildDisplayName({
      email: user.email,
      nickname,
      role: "user",
    }),
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

  return syncBootstrapModeratorGrant(updatedUser);
}

export function completeSpecialistProfile(
  user: SessionUser,
  input: CompleteSpecialistProfileInput,
) {
  const normalizedInput = validateSpecialistProfileInput(input);
  const updatedUser = updateUserProfileFields({
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
    userId: user.id,
  });

  if (!updatedUser) {
    throw new AuthServiceError({
      message: "Пользователь не найден.",
      status: 404,
    });
  }

  return syncBootstrapModeratorGrant(updatedUser);
}

export function getCurrentUserBySessionToken(sessionToken: string): SessionUser | null {
  const session = findSessionWithUserByTokenHash(hashSessionToken(sessionToken));

  if (!session) {
    return null;
  }

  return syncBootstrapModeratorGrant(session.user);
}

export function deleteSessionByToken(sessionToken: string) {
  deleteSessionByTokenHash(hashSessionToken(sessionToken));
}
