import type { SpecialistStatus, UserRole } from "@/features/auth/types";

export const SESSION_COOKIE_NAME = "psy_auth_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_STATE_CHANGED_EVENT = "psy-prototype:auth-changed";

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const PROFILE_NAME_MAX_LENGTH = 40;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 60;

export const NICKNAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9._]+$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Пользователь",
  specialist: "Специалист",
};

export const SPECIALIST_STATUS_LABELS: Record<SpecialistStatus, string> = {
  none: "Без статуса",
  pending: "На проверке",
  verified: "Подтвержден",
  rejected: "Отклонен",
  suspended: "Приостановлен",
};
