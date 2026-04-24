import type { Metadata } from "next";
import { DiscussionViewScreen } from "@/features/feed/components/discussion-view-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { findDiscussionById } from "@/features/feed/lib/discussions-repository";

type DiscussionPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
    commentId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Обсуждение · внутри",
  description: "Экран просмотра обсуждения на платформе внутри.",
};

export default async function DiscussionPage({
  params,
  searchParams,
}: DiscussionPageProps) {
  const { postId } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  const initialPost = await findDiscussionById(postId, currentUser);

  return (
    <DiscussionViewScreen
      key={postId}
      initialPost={initialPost}
      initialReturnTo={resolvedSearchParams.returnTo ?? null}
      initialHighlightedCommentId={resolvedSearchParams.commentId ?? null}
    />
  );
}
