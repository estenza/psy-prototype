import { redirect } from "next/navigation";
import { ProfilePageContent } from "@/features/auth/components/profile-page-content";
import { listAuthorPublishedComments } from "@/features/comments/lib/comments-service";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  listAuthorProfileFavoritePosts,
  listAuthorProfilePosts,
} from "@/features/feed/lib/post-query-service";
import { buildOwnProfilePath } from "@/features/auth/lib/profile";
import { getAuthorFollowSummary } from "@/features/social/lib/follows-repository";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const ownProfilePath = buildOwnProfilePath(currentUser);

  if (ownProfilePath) {
    redirect(ownProfilePath);
  }

  const [posts, favoritePosts, replies, followSummary] = await Promise.all([
    listAuthorProfilePosts(currentUser.id, currentUser),
    listAuthorProfileFavoritePosts(currentUser.id, currentUser),
    listAuthorPublishedComments({
      authorUserId: currentUser.id,
      viewerUserId: currentUser.id,
    }),
    getAuthorFollowSummary(currentUser.id, currentUser.id),
  ]);

  return (
    <ProfilePageContent
      posts={posts}
      favoritePosts={favoritePosts}
      followSummary={followSummary}
      replies={replies}
      user={currentUser}
      viewerIsOwner
      profilePath="/profile"
    />
  );
}
