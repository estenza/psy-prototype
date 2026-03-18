import type { User } from "@/types/user";

export type Psychologist = User & {
  specialization?: string;
  tagline?: string;
};
