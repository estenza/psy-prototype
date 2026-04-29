"use client";

import { toast } from "@heroui/react";
import { useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import type {
  NotificationPreferenceKey,
  NotificationPreferences,
} from "@/features/auth/types";

type NotificationPreferencesCardProps = {
  initialPreferences: NotificationPreferences;
};

const NOTIFICATION_PREFERENCE_ITEMS: Array<{
  description: string;
  key: NotificationPreferenceKey;
  title: string;
}> = [
  {
    key: "postReplies",
    title: "Ответы в моих постах",
    description: "Новые ответы от пользователей и специалистов в созданных вами постах.",
  },
  {
    key: "directReplies",
    title: "Прямые ответы на мои ответы",
    description: "Ответы в ветках, где другой человек ответил именно на ваш комментарий.",
  },
  {
    key: "followedPostReplies",
    title: "Ответы в отслеживаемых постах",
    description: "Новые ответы в чужих постах, для которых вы включили действие «Следить за постом».",
  },
  {
    key: "followedAuthorPosts",
    title: "Новые посты авторов",
    description: "Публикации пользователей и специалистов, которых вы читаете.",
  },
  {
    key: "systemMessages",
    title: "Важные сообщения внутри",
    description: "Новости, рекомендации и важные изменения платформы.",
  },
];

async function updatePreference(nextPreferences: Partial<NotificationPreferences>) {
  const response = await fetch("/api/notification-preferences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(nextPreferences),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    preferences?: NotificationPreferences;
  } | null;

  if (!response.ok || !payload?.preferences) {
    throw new Error(payload?.error ?? "Не удалось сохранить настройки уведомлений.");
  }

  return payload.preferences;
}

export function NotificationPreferencesCard({
  initialPreferences,
}: NotificationPreferencesCardProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pendingKey, setPendingKey] = useState<NotificationPreferenceKey | null>(null);

  function handleToggle(key: NotificationPreferenceKey) {
    const previousPreferences = preferences;
    const nextValue = !preferences[key];
    const optimisticPreferences = {
      ...preferences,
      [key]: nextValue,
    };

    setPreferences(optimisticPreferences);
    setPendingKey(key);

    void updatePreference({ [key]: nextValue })
      .then((savedPreferences) => {
        setPreferences(savedPreferences);
      })
      .catch((error: unknown) => {
        setPreferences(previousPreferences);
        toast.danger(
          error instanceof Error
            ? error.message
            : "Не удалось сохранить настройки уведомлений.",
        );
      })
      .finally(() => {
        setPendingKey((currentKey) => (currentKey === key ? null : currentKey));
      });
  }

  return (
    <section className="surface-elevated overflow-hidden rounded-[28px]">
      <div className="px-6 pb-4 pt-6">
        <h3 className="text-[18px] font-semibold text-[var(--label-primary)]">
          Уведомления
        </h3>
        <p className="mt-2 text-[14px] leading-6 text-[var(--label-secondary)]">
          Выберите, какие события будут появляться в колокольчике.
        </p>
      </div>

      <div className="divide-y divide-[var(--separator)]">
        {NOTIFICATION_PREFERENCE_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={pendingKey === item.key}
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--fill-quaternary)] disabled:cursor-wait disabled:opacity-70"
            onClick={() => handleToggle(item.key)}
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-[var(--label-primary)]">
                {item.title}
              </span>
              <span className="mt-1 block text-[13px] leading-5 text-[var(--label-secondary)]">
                {item.description}
              </span>
            </span>
            <ToggleSwitch checked={preferences[item.key]} />
          </button>
        ))}
      </div>
    </section>
  );
}
