import type {
  AuthUser,
  SpecialistEducationItem,
  SpecialistGender,
  SpecialistStatus,
  UserRole,
} from "@/features/auth/types";

export type AdminUserRoleFilter = "all" | "moderator" | "specialist" | "user";
export type AdminSpecialistStatusFilter = "all" | SpecialistStatus;

export type AdminUsersFilters = {
  specialistStatus: AdminSpecialistStatusFilter;
  role: AdminUserRoleFilter;
};

export type AdminListedUser = AuthUser;

export type AdminUsersResponse = {
  users: AdminListedUser[];
  filters: AdminUsersFilters;
};

export type AdminManagedUserPayload = {
  avatarCardUrl?: string | null;
  avatarSourceUrl?: string | null;
  avatarUrl?: string | null;
  displayName?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  patronymic?: string | null;
  nickname?: string | null;
  profileDescription?: string | null;
  role?: UserRole;
  education?: SpecialistEducationItem[];
  specialties?: string[];
  specialistGender?: SpecialistGender | null;
  specialistBirthDate?: string | null;
  specialistPhoneCountry?: string | null;
  specialistPhoneNumber?: string | null;
  specialistTelegramUrl?: string | null;
  specialistMaxUrl?: string | null;
  specialistWhatsappUrl?: string | null;
  workTopics?: string[];
};

export type AdminCreateManagedUserPayload = Required<
  Pick<AdminManagedUserPayload, "email" | "role">
> & AdminManagedUserPayload;

export type AdminUpdateManagedUserPayload = Omit<AdminManagedUserPayload, "email">;

export type AdminBanUserPayload = {
  reason?: string | null;
};

export type AdminManagedUserResponse = {
  ok: true;
  user: AdminListedUser;
};

export type AdminManagedUserFieldErrorName =
  | "displayName"
  | "email"
  | "firstName"
  | "lastName"
  | "patronymic"
  | "nickname"
  | "avatarUrl"
  | "profileDescription"
  | "education"
  | "specialties"
  | "specialistGender"
  | "specialistBirthDate"
  | "specialistPhoneCountry"
  | "specialistPhoneNumber"
  | "specialistTelegramUrl"
  | "specialistMaxUrl"
  | "specialistWhatsappUrl"
  | "workTopics";

export type AdminManagedUserErrorResponse = {
  error: string;
  fieldErrors?: Partial<Record<AdminManagedUserFieldErrorName, string>>;
};

export type AdminUpdateUserPayload = {
  isModerator?: boolean;
  role?: UserRole;
  specialistStatus?: SpecialistStatus;
};

export type AdminDeleteUserResponse = {
  ok: true;
};
