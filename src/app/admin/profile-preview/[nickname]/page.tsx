import { notFound, redirect } from "next/navigation";
import { ProfilePrimaryColumn } from "@/features/auth/components/profile-page-content";
import { findUserByNickname } from "@/features/auth/lib/auth-repository";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  buildProfilePathFromNickname,
  normalizeNickname,
} from "@/features/auth/lib/profile";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { listAuthorPublishedComments } from "@/features/comments/lib/comments-service";
import {
  listAuthorProfileFavoritePosts,
  listAuthorProfilePosts,
} from "@/features/feed/lib/post-query-service";
import {
  getAuthorFollowSummary,
  listAuthorFollowers,
  listAuthorFollowing,
} from "@/features/social/lib/follows-repository";

type AdminProfilePreviewPageProps = {
  params: Promise<{
    nickname: string;
  }>;
};

export default async function AdminProfilePreviewPage({
  params,
}: AdminProfilePreviewPageProps) {
  await requireModeratorPageAccess();

  const { nickname: rawNickname } = await params;
  const normalizedNickname = normalizeNickname(rawNickname);
  const canonicalProfilePath = buildProfilePathFromNickname(normalizedNickname);

  if (!canonicalProfilePath) {
    notFound();
  }

  if (rawNickname !== normalizedNickname) {
    redirect(`/admin/profile-preview/${encodeURIComponent(normalizedNickname)}`);
  }

  const [currentUser, profileUser] = await Promise.all([
    getCurrentUser(),
    findUserByNickname(normalizedNickname),
  ]);

  if (!profileUser) {
    notFound();
  }

  const [
    posts,
    favoritePosts,
    replies,
    followSummary,
    followers,
    following,
  ] = await Promise.all([
    listAuthorProfilePosts(profileUser.id, currentUser),
    listAuthorProfileFavoritePosts(profileUser.id, currentUser),
    listAuthorPublishedComments({
      authorUserId: profileUser.id,
      viewerUserId: currentUser?.id ?? null,
    }),
    getAuthorFollowSummary(profileUser.id, currentUser?.id ?? null),
    listAuthorFollowers(profileUser.id),
    listAuthorFollowing(profileUser.id),
  ]);

  return (
    <main className="surface-primary text-label-primary min-h-dvh px-0 py-0">
      <div className="mx-auto flex w-full max-w-[672px] min-w-0 flex-col gap-0">
        <ProfilePrimaryColumn
          posts={posts}
          favoritePosts={favoritePosts}
          followers={followers}
          followSummary={followSummary}
          following={following}
          user={profileUser}
          replies={replies}
          viewerIsOwner={currentUser?.id === profileUser.id}
          profilePath={canonicalProfilePath}
        />
      </div>
    </main>
  );
}
