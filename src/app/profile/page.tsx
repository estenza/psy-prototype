import { redirect } from "next/navigation";
import { ProfilePageContent } from "@/features/auth/components/profile-page-content";
import { listPublishedCommentsByAuthorUserId } from "@/features/comments/lib/comments-repository";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { listDiscussionsByAuthorUserId } from "@/features/feed/lib/discussions-repository";
import { buildOwnProfilePath } from "@/features/auth/lib/profile";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in?next=%2Fprofile");
  }

  const ownProfilePath = buildOwnProfilePath(currentUser);

  if (ownProfilePath) {
    redirect(ownProfilePath);
  }

  const [discussions, replies] = await Promise.all([
    listDiscussionsByAuthorUserId(currentUser.id, currentUser),
    listPublishedCommentsByAuthorUserId(currentUser.id, currentUser.id),
  ]);

  return (
    <ProfilePageContent
      discussions={discussions}
      replies={replies}
      user={currentUser}
      viewerIsOwner
      profilePath="/profile"
    />
  );
}
