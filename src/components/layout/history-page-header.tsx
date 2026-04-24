"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";

type HistoryPageHeaderProps = {
  fallbackHref?: string;
  title?: React.ReactNode;
};

export function HistoryPageHeader({
  fallbackHref = "/",
  title,
}: HistoryPageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    startTransition(() => {
      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.push(fallbackHref);
    });
  }

  return (
    <PageHeader
      onBack={handleBack}
      title={title}
    />
  );
}
