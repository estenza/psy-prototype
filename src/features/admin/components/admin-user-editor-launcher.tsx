"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";

export function AdminUserEditorLauncher({
  defaultRole = "user",
  label,
}: {
  defaultRole?: "specialist" | "user";
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        className="!min-w-[132px] !cursor-pointer !justify-center !rounded-full !px-5"
        onClick={() => setIsOpen(true)}
      >
        {label ?? "Создать"}
      </Button>

      <AdminUserEditorModal
        defaultRole={defaultRole}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
