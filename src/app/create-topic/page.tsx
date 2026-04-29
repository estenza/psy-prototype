import type { Metadata } from "next";
import { CreateTopicEntry } from "@/features/topic-creation/components/create-topic-entry";

export const metadata: Metadata = {
  title: "Новый пост · внутри",
  description: "Экран для создания нового поста на платформе внутри.",
};

export default async function CreateTopicPage() {
  return <CreateTopicEntry />;
}
 
