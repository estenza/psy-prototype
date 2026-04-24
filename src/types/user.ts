export type User = {
  id?: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  role?: "user" | "specialist" | null;
};

export type UserSummary = Pick<User, "id" | "name" | "handle" | "avatarUrl" | "role">;
