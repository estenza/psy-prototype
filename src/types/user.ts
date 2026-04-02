export type User = {
  id?: string;
  name: string;
  handle: string;
};

export type UserSummary = Pick<User, "id" | "name" | "handle">;
