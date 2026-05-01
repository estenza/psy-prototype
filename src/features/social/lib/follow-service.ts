import "server-only";

import {
  getAuthorFollowSummary,
  setAuthorFollow,
  setPostFollow,
} from "@/features/social/lib/follows-repository";
import type { SessionUser } from "@/features/auth/types";

export async function toggleAuthorFollow(params: {
  actor: SessionUser;
  followedUserId: string;
  following: boolean;
}) {
  await setAuthorFollow(params);
  return getAuthorFollowSummary(params.followedUserId, params.actor.id);
}

export function togglePostFollow(params: {
  actor: SessionUser;
  following: boolean;
  postId: string;
}) {
  return setPostFollow(params);
}
