import {
  isReservedProfilePathSegment,
  normalizeNickname,
  RESERVED_NICKNAME_MESSAGE,
} from "@/features/auth/lib/profile";

export const ADMIN_USER_NAME_MAX_LENGTH = 30;
export const ADMIN_ACCOUNT_NAME_MIN_LENGTH = 3;
export const ADMIN_ACCOUNT_NAME_MAX_LENGTH = 15;
export const ADMIN_ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
export const ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE =
  `Имя аккаунта может содержать буквы, цифры и символы подчеркивания и должно иметь длину от ${ADMIN_ACCOUNT_NAME_MIN_LENGTH} до ${ADMIN_ACCOUNT_NAME_MAX_LENGTH} символов.`;

export function normalizeAdminAccountName(value: string | null | undefined) {
  return normalizeNickname(value);
}

export function getAdminUserNameError(value: string | null | undefined) {
  const normalizedValue = (value ?? "").trim();

  if (!normalizedValue) {
    return "Введите имя.";
  }

  if (normalizedValue.length > ADMIN_USER_NAME_MAX_LENGTH) {
    return `Имя должно быть не длиннее ${ADMIN_USER_NAME_MAX_LENGTH} символов.`;
  }

  return null;
}

export function getAdminAccountNameError(value: string | null | undefined) {
  const normalizedValue = normalizeAdminAccountName(value);

  if (!normalizedValue) {
    return "Введите имя аккаунта.";
  }

  if (
    normalizedValue.length < ADMIN_ACCOUNT_NAME_MIN_LENGTH
    || normalizedValue.length > ADMIN_ACCOUNT_NAME_MAX_LENGTH
    || !ADMIN_ACCOUNT_NAME_PATTERN.test(normalizedValue)
  ) {
    return ADMIN_ACCOUNT_NAME_VALIDATION_MESSAGE;
  }

  if (isReservedProfilePathSegment(normalizedValue)) {
    return RESERVED_NICKNAME_MESSAGE;
  }

  return null;
}
