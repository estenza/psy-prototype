import type { Metadata } from "next";
import { DiscussionViewScreen } from "@/features/feed/components/discussion-view-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { findDiscussionById } from "@/features/feed/lib/discussions-repository";

type DiscussionPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Обсуждение · внутри",
  description: "Экран просмотра обсуждения на платформе внутри.",
};

export default async function DiscussionPage({ params }: DiscussionPageProps) {
  const { postId } = await params;
  const currentUser = await getCurrentUser();
  const initialPost = await findDiscussionById(postId, currentUser);

  return <DiscussionViewScreen key={postId} initialPost={initialPost} />;
}
