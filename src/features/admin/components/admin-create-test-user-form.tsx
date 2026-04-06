"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, SPECIALIST_STATUS_LABELS } from "@/features/auth/constants";
import type {
  AdminCreateTestUserResponse,
} from "@/features/admin/types";
import type { SpecialistStatus, UserRole } from "@/features/auth/types";

const SPECIALIST_STATUS_OPTIONS: SpecialistStatus[] = [
  "verified",
  "pending",
  "suspended",
  "rejected",
  "none",
];

type CreationState = AdminCreateTestUserResponse["credentials"] | null;
type AdminCreateTestUserErrorResponse = {
  error?: string;
};

async function copyToClipboard(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("Буфер обмена недоступен в этом браузере.");
  }

  await navigator.clipboard.writeText(value);
}

export function AdminCreateTestUserForm() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("user");
  const [specialistStatus, setSpecialistStatus] =
    useState<SpecialistStatus>("verified");
  const [createdCredentials, setCreatedCredentials] = useState<CreationState>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const credentialsText = useMemo(() => {
    if (!createdCredentials) {
      return "";
    }

    return [
      `Email: ${createdCredentials.email}`,
      `Пароль: ${createdCredentials.password}`,
      `Имя: ${createdCredentials.displayName}`,
      `Хэндл: ${createdCredentials.handle ?? "—"}`,
      `Роль: ${ROLE_LABELS[createdCredentials.role]}`,
      `Статус: ${SPECIALIST_STATUS_LABELS[createdCredentials.specialistStatus]}`,
    ].join("\n");
  }, [createdCredentials]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          specialistStatus: role === "specialist" ? specialistStatus : "none",
        }),
      });
      const payload = (await response.json()) as
        | AdminCreateTestUserResponse
        | AdminCreateTestUserErrorResponse;

      if (!response.ok) {
        throw new Error(
          ("error" in payload ? payload.error : undefined) ??
            "Не удалось создать тестового пользователя.",
        );
      }

      if (!("ok" in payload)) {
        throw new Error("Не удалось создать тестового пользователя.");
      }

      setCreatedCredentials(payload.credentials);
      setFeedbackTone("success");
      setFeedback("Тестовый пользователь создан.");
      router.refresh();
    } catch (error) {
      setFeedbackTone("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Не удалось создать тестового пользователя.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyCredentials() {
    if (!credentialsText) {
      return;
    }

    setIsCopying(true);

    try {
      await copyToClipboard(credentialsText);
      setFeedbackTone("success");
      setFeedback("Данные скопированы в буфер обмена.");
    } catch (error) {
      setFeedbackTone("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Не удалось скопировать данные пользователя.",
      );
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <section className="border-separator mb-6 rounded-[24px] border p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
          QA
        </p>
        <h2 className="font-helvetica text-[22px] font-bold leading-none">
          Создать тестового пользователя
        </h2>
        <p className="text-sm text-[var(--label-secondary)]">
          Генерирует новый фейковый email и пароль для быстрого входа под тестовым
          аккаунтом.
        </p>
      </div>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-sm">
            <span className="font-medium">Роль</span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as UserRole);
              }}
              className="border-separator bg-background-primary rounded-xl border px-3 py-2"
              disabled={isSubmitting}
            >
              <option value="user">{ROLE_LABELS.user}</option>
              <option value="specialist">{ROLE_LABELS.specialist}</option>
            </select>
          </label>

          {role === "specialist" ? (
            <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-sm">
              <span className="font-medium">Статус специалиста</span>
              <select
                value={specialistStatus}
                onChange={(event) => {
                  setSpecialistStatus(event.target.value as SpecialistStatus);
                }}
                className="border-separator bg-background-primary rounded-xl border px-3 py-2"
                disabled={isSubmitting}
              >
                {SPECIALIST_STATUS_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {SPECIALIST_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            className="!rounded-full !px-5"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Создаём..." : "Создать пользователя"}
          </Button>

          {createdCredentials ? (
            <Button
              type="button"
              variant="secondary"
              className="!rounded-full !px-5"
              disabled={isCopying}
              onClick={handleCopyCredentials}
            >
              {isCopying ? "Копируем..." : "Скопировать данные"}
            </Button>
          ) : null}
        </div>
      </form>

      {feedback ? (
        <p
          className={`mt-3 text-sm ${
            feedbackTone === "error"
              ? "text-[var(--accent-critical)]"
              : "text-[var(--label-secondary)]"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {createdCredentials ? (
        <div className="bg-background-primary border-separator mt-4 rounded-[20px] border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
                Email
              </p>
              <p className="mt-1 text-sm font-medium">{createdCredentials.email}</p>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
                Пароль
              </p>
              <p className="mt-1 text-sm font-medium">{createdCredentials.password}</p>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
                Имя
              </p>
              <p className="mt-1 text-sm font-medium">{createdCredentials.displayName}</p>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
                Хэндл
              </p>
              <p className="mt-1 text-sm font-medium">{createdCredentials.handle ?? "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
