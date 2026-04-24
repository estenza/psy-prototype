import { notFound, redirect } from "next/navigation";
import { ProfilePageContent } from "@/features/auth/components/profile-page-content";
import { listPublishedCommentsByAuthorUserId } from "@/features/comments/lib/comments-repository";
import { findUserByNickname } from "@/features/auth/lib/auth-repository";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { listDiscussionsByAuthorUserId } from "@/features/feed/lib/discussions-repository";
import {
  buildProfilePathFromNickname,
  normalizeNickname,
} from "@/features/auth/lib/profile";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{
    nickname: string;
  }>;
}) {
  const { nickname: rawNickname } = await params;
  const normalizedNickname = normalizeNickname(rawNickname);
  const canonicalProfilePath = buildProfilePathFromNickname(normalizedNickname);

  if (!canonicalProfilePath) {
    notFound();
  }

  if (rawNickname !== normalizedNickname) {
    redirect(canonicalProfilePath);
  }

  const [currentUser, profileUser] = await Promise.all([
    getCurrentUser(),
    findUserByNickname(normalizedNickname),
  ]);

  if (!profileUser) {
    notFound();
  }

  const [discussions, replies] = await Promise.all([
    listDiscussionsByAuthorUserId(profileUser.id, currentUser),
    listPublishedCommentsByAuthorUserId(profileUser.id, currentUser?.id ?? null),
  ]);

  return (
    <ProfilePageContent
      discussions={discussions}
      user={profileUser}
      replies={replies}
      viewerIsOwner={currentUser?.id === profileUser.id}
      profilePath={canonicalProfilePath}
    />
  );
}
