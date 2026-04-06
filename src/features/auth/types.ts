export type UserRole = "user" | "specialist";

export type SpecialistStatus =
  | "none"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export type OnboardingStep =
  | "role"
  | "user-profile"
  | "specialist-profile"
  | "complete";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  avatarUrl: string | null;
  avatarSourceUrl: string | null;
  avatarCardUrl: string | null;
  profileDescription: string | null;
  specialties: string[];
  role: UserRole;
  specialistStatus: SpecialistStatus;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  isModerator: boolean;
  onboardingStep: OnboardingStep;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type SessionUser = AuthUser;

export type SignUpInput = {
  email: string;
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetConfirmInput = {
  token: string;
  password: string;
  passwordConfirmation: string;
};

export type SelectRoleInput = {
  role: UserRole;
};

export type CompleteUserProfileInput = {
  nickname: string;
};

export type CompleteSpecialistProfileInput = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
};

export type AuthSuccessResponse = {
  ok: true;
  user: SessionUser;
};

export type AuthMessageResponse = {
  ok: true;
  message: string;
  debugResetUrl?: string;
};

export type AuthFieldErrorName =
  | "email"
  | "password"
  | "passwordConfirmation"
  | "token"
  | "role"
  | "nickname"
  | "firstName"
  | "lastName"
  | "patronymic";

export type AuthErrorResponse = {
  error: string;
  fieldErrors?: Partial<Record<AuthFieldErrorName, string>>;
};

export type CurrentUserResponse = {
  user: SessionUser | null;
};

export type NicknameAvailabilityResponse = {
  available: boolean;
  normalizedNickname: string | null;
  reason?: string;
};
