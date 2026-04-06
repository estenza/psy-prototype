import type { AuthUser, SpecialistStatus, UserRole } from "@/features/auth/types";

export type AdminUserRoleFilter = "all" | "moderator" | "specialist";
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

export type AdminCreateTestUserPayload = {
  role?: UserRole;
  specialistStatus?: SpecialistStatus;
};

export type AdminCreateTestUserCredentials = {
  displayName: string;
  email: string;
  handle: string | null;
  password: string;
  role: UserRole;
  specialistStatus: SpecialistStatus;
};

export type AdminCreateTestUserResponse = {
  ok: true;
  credentials: AdminCreateTestUserCredentials;
  user: AdminListedUser;
};

export type AdminUpdateUserPayload = {
  isModerator?: boolean;
  role?: UserRole;
  specialistStatus?: SpecialistStatus;
};
