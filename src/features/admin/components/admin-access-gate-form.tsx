"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";

export function AdminAccessGateForm({
  redirectPath,
}: {
  redirectPath: string;
}) {
  const [adminAccessKey, setAdminAccessKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/auth/admin-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminAccessKey,
        }),
      });
      const isJsonResponse = response.headers.get("content-type")?.includes("application/json");
      const payload = isJsonResponse
        ? await response.json().catch(() => null)
        : null;

      if (!response.ok) {
        setFormError(
          response.status === 429
            ? "Слишком много попыток. Попробуйте позже."
            : typeof payload?.error === "string"
              ? "Доступ отклонен. Попробуйте снова."
              : "Не удалось подтвердить доступ.",
        );
        return;
      }

      window.location.assign(redirectPath);
    } catch {
      setFormError("Не удалось подтвердить доступ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-7 py-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthField
          name="adminAccessKey"
          type="text"
          label="Ключ доступа"
          value={adminAccessKey}
          onChange={setAdminAccessKey}
          placeholder="Введите ключ доступа"
          autoComplete="off"
          disablePasswordManagerHints
          maskedText
        />

        {formError ? (
          <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
            {formError}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="mt-2 w-full"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Продолжить
        </Button>
      </form>
    </div>
  );
}
