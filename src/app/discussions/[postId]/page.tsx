import type { Metadata } from "next";
import { DiscussionViewScreen } from "@/features/feed/components/discussion-view-screen";

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

  return <DiscussionViewScreen key={postId} postId={postId} />;
}
