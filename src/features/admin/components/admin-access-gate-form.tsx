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
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-helvetica text-[28px] font-bold leading-none text-[var(--label-primary)]">
          Доступ
        </h1>
        <p className="text-label-tertiary text-[14px] leading-6">
          Подтвердите доступ, чтобы продолжить.
        </p>
      </div>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <AuthField
          name="adminAccessKey"
          type="password"
          label="Ключ доступа"
          value={adminAccessKey}
          onChange={setAdminAccessKey}
          placeholder="Введите ключ доступа"
          autoComplete="off"
        />

        {formError ? (
          <div className="rounded-2xl bg-[color-mix(in_srgb,var(--accent-critical)_10%,white)] px-4 py-3 text-[13px] leading-5 text-[var(--accent-critical)]">
            {formError}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-2 w-full !rounded-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Секунду..." : "Продолжить"}
        </Button>
      </form>
    </div>
  );
}
