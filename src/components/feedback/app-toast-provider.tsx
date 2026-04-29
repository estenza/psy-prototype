"use client";

import { Toast } from "@heroui/react";

export function AppToastProvider() {
  return (
    <Toast.Provider
      gap={28}
      maxVisibleToasts={1}
      placement="bottom"
      scaleFactor={0.08}
    />
  );
}
