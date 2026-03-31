import type { Metadata } from "next";
import { CreateTopicScreen } from "@/features/topic-creation/components/create-topic-screen";

export const metadata: Metadata = {
  title: "Новое обсуждение · внутри",
  description: "Экран для создания нового обсуждения на платформе внутри.",
};

export default function CreateTopicPage() {
  return <CreateTopicScreen />;
}
