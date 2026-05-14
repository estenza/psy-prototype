"use client";

import { Toast } from "@heroui/react";

import { appToastQueue } from "@/components/feedback/toast";

export function AppToastProvider() {
  return (
    <Toast.Provider
      gap={28}
      maxVisibleToasts={1}
      placement="bottom"
      queue={appToastQueue}
      scaleFactor={0.08}
    />
  );
}
