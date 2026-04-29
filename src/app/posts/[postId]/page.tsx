import type { Metadata } from "next";
import { PostViewScreen } from "@/features/feed/components/post-view-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { findPostById } from "@/features/feed/lib/posts-repository";

type PostPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
    commentId?: string;
    commentIds?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Пост · внутри",
  description: "Экран просмотра поста на платформе внутри.",
};

export default async function PostPage({
  params,
  searchParams,
}: PostPageProps) {
  const { postId } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  const initialPost = await findPostById(postId, currentUser);
  const highlightedCommentIds = [
    ...(resolvedSearchParams.commentIds
      ?.split(",")
      .map((commentId) => commentId.trim())
      .filter(Boolean) ?? []),
    ...(resolvedSearchParams.commentId ? [resolvedSearchParams.commentId] : []),
  ];

  return (
    <PostViewScreen
      key={postId}
      initialPost={initialPost}
      initialReturnTo={resolvedSearchParams.returnTo ?? null}
      initialHighlightedCommentIds={[...new Set(highlightedCommentIds)]}
    />
  );
}
