import { redirect } from "next/navigation";
import { ProfilePageContent } from "@/features/auth/components/profile-page-content";
import { listPublishedCommentsByAuthorUserId } from "@/features/comments/lib/comments-repository";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  listPostsByAuthorUserId,
  listProfileFavoritePostsByUserId,
} from "@/features/feed/lib/posts-repository";
import { buildOwnProfilePath } from "@/features/auth/lib/profile";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const ownProfilePath = buildOwnProfilePath(currentUser);

  if (ownProfilePath) {
    redirect(ownProfilePath);
  }

  const [posts, favoritePosts, replies] = await Promise.all([
    listPostsByAuthorUserId(currentUser.id, currentUser),
    listProfileFavoritePostsByUserId(currentUser.id, currentUser),
    listPublishedCommentsByAuthorUserId(currentUser.id, currentUser.id),
  ]);

  return (
    <ProfilePageContent
      posts={posts}
      favoritePosts={favoritePosts}
      replies={replies}
      user={currentUser}
      viewerIsOwner
      profilePath="/profile"
    />
  );
}
