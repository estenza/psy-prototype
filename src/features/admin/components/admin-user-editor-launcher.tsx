"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "@/components/ui/icons";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";

export function AdminUserEditorLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        className="!rounded-full !px-5"
        icon={<PlusCircleIcon />}
        onClick={() => setIsOpen(true)}
      >
        Добавить пользователя
      </Button>

      <AdminUserEditorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
