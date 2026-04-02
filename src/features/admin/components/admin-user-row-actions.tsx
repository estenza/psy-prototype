"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminListedUser } from "@/features/admin/types";
import { ROLE_LABELS, SPECIALIST_STATUS_LABELS } from "@/features/auth/constants";
import type { SpecialistStatus, UserRole } from "@/features/auth/types";

type AdminUserRowActionsProps = {
  user: AdminListedUser;
};

const ROLE_OPTIONS: UserRole[] = ["user", "specialist"];
const SPECIALIST_STATUS_OPTIONS: SpecialistStatus[] = [
  "none",
  "pending",
  "verified",
  "rejected",
  "suspended",
];

export function AdminUserRowActions({ user }: AdminUserRowActionsProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(user.role);
  const [specialistStatus, setSpecialistStatus] = useState<SpecialistStatus>(
    user.specialistStatus,
  );
  const [isModerator, setIsModerator] = useState(user.isModerator);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");

  async function updateUser(nextPayload: {
    isModerator?: boolean;
    role?: UserRole;
    specialistStatus?: SpecialistStatus;
  }) {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextPayload),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось обновить пользователя.");
      }

      setMessageTone("success");
      setMessage("Сохранено.");
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof Error ? error.message : "Не удалось обновить пользователя.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await updateUser({
      isModerator,
      role,
      specialistStatus,
    });
  }

  async function handleToggleModerator() {
    const nextIsModerator = !isModerator;
    setIsModerator(nextIsModerator);
    await updateUser({
      isModerator: nextIsModerator,
    });
  }

  return (
    <div className="flex min-w-[240px] flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRole);
          }}
          className="border-separator bg-background-primary rounded-xl border px-3 py-2 text-sm"
          disabled={isSaving}
        >
          {ROLE_OPTIONS.map((option) => (
            <option
              key={option}
              value={option}
            >
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>

        <select
          value={specialistStatus}
          onChange={(event) => {
            setSpecialistStatus(event.target.value as SpecialistStatus);
          }}
          className="border-separator bg-background-primary rounded-xl border px-3 py-2 text-sm"
          disabled={isSaving}
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
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="!rounded-full !px-4"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="!rounded-full !px-4"
          disabled={isSaving}
          onClick={handleToggleModerator}
        >
          {isModerator ? "Снять moderator" : "Назначить moderator"}
        </Button>
      </div>

      {message ? (
        <p
          className={`text-[12px] leading-4 ${
            messageTone === "error"
              ? "text-[var(--accent-critical)]"
              : "text-[var(--label-secondary)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
