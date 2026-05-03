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
  profileCoverUrl: string | null;
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
  displayName?: string;
  nickname?: string;
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
  debugOtpCode?: string;
  debugResetUrl?: string;
};

export type AuthFieldErrorName =
  | "email"
  | "password"
  | "passwordConfirmation"
  | "token"
  | "role"
  | "displayName"
  | "profileDescription"
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

export type IgnoredAuthorSummary = {
  avatarUrl: string | null;
  handle: string;
  id: string;
  ignoredAt: string;
  name: string;
  role: UserRole | null;
};

export type AuthorFollowSummary = {
  followersCount: number;
  followingCount: number;
  viewerFollowing: boolean;
};

export type NotificationPreferenceKey =
  | "postReplies"
  | "directReplies"
  | "followedPostReplies"
  | "followedAuthorPosts"
  | "systemMessages";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export type NotificationKind =
  | "post_reply"
  | "direct_reply"
  | "followed_post_reply"
  | "followed_author_post"
  | "system";

export type UserNotification = {
  actorAvatarUrl: string | null;
  actorHandle: string | null;
  actorName: string | null;
  body: string | null;
  createdAt: string;
  href: string;
  id: string;
  isRead: boolean;
  title: string;
  type: NotificationKind;
};

export type NicknameAvailabilityResponse = {
  available: boolean;
  normalizedNickname: string | null;
  reason?: string;
};
