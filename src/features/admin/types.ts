import type { AuthUser, SpecialistStatus, UserRole } from "@/features/auth/types";

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
  nickname?: string | null;
  password?: string;
  profileDescription?: string | null;
  role?: UserRole;
  specialties?: string[];
};

export type AdminCreateManagedUserPayload = Required<
  Pick<AdminManagedUserPayload, "email" | "password" | "role">
> & AdminManagedUserPayload;

export type AdminUpdateManagedUserPayload = Omit<AdminManagedUserPayload, "email" | "password">;

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
  | "nickname"
  | "password"
  | "specialties";

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
