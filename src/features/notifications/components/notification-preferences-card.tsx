"use client";

import { toast } from "@/components/feedback/toast";
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
    title: "Комментарии в моих постах",
    description: "Новые комментарии от пользователей и специалистов в созданных вами постах.",
  },
  {
    key: "directReplies",
    title: "Комментарии к моим комментариям",
    description: "Комментарии в ветках, где другой человек продолжил именно ваш комментарий.",
  },
  {
    key: "followedPostReplies",
    title: "Комментарии в отслеживаемых постах",
    description: "Новые комментарии в чужих постах, для которых вы включили действие «Следить за постом».",
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
      <div className="divide-y divide-[var(--separator)]">
        {NOTIFICATION_PREFERENCE_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="block text-[16px] font-medium text-[var(--label-primary)]">
                {item.title}
              </span>
              <span className="mt-1 block text-[14px] leading-5 text-[var(--label-tertiary)]">
                {item.description}
              </span>
            </span>
            <ToggleSwitch
              aria-label={item.title}
              checked={preferences[item.key]}
              disabled={pendingKey === item.key}
              onClick={() => handleToggle(item.key)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
