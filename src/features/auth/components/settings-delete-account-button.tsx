"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";

export function SettingsDeleteAccountButton() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function deleteAccount() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не удалось отключить аккаунт.");
      }

      dispatchAuthStateChanged();
      setIsDialogOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось отключить аккаунт.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        className="w-full justify-center min-[481px]:w-auto"
        isDisabled={isDeleting}
        onPress={() => {
          setErrorMessage(null);
          setIsDialogOpen(true);
        }}
        variant="secondary"
      >
        Отключить аккаунт
      </Button>

      {isDialogOpen ? (
        <ConfirmDialog
          title="Отключить аккаунт?"
          description="Отключение аккаунта скрывает ваш аккаунт, ваши посты и ответы от других пользователей. Аккаунт и его данные можно будет восстановить в течение 30 дней после отключения."
          actionLabel="Отключить"
          errorMessage={errorMessage}
          isLoading={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setIsDialogOpen(false);
              setErrorMessage(null);
            }
          }}
          onConfirm={() => {
            void deleteAccount();
          }}
        />
      ) : null}
    </>
  );
}
