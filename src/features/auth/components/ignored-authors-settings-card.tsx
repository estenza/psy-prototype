"use client";

import { toast } from "@heroui/react";
import { useState } from "react";
import { NotIgnoreAuthorIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import type { IgnoredAuthorSummary } from "@/features/auth/types";

type IgnoredAuthorsSettingsCardProps = {
  initialAuthors: IgnoredAuthorSummary[];
};

async function requestUnignoreAuthor(ignoredUserId: string) {
  const response = await fetch("/api/ignored-authors", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ignoredUserId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось обновить игнор-лист.");
  }
}

export function IgnoredAuthorsSettingsCard({
  initialAuthors,
}: IgnoredAuthorsSettingsCardProps) {
  const [authors, setAuthors] = useState(initialAuthors);

  function handleUnignore(author: IgnoredAuthorSummary) {
    setAuthors((current) => current.filter((item) => item.id !== author.id));

    void requestUnignoreAuthor(author.id)
      .then(() => {
        toast.success(`${author.handle} больше не в игнор-листе`);
      })
      .catch((error: unknown) => {
        setAuthors((current) => (
          current.some((item) => item.id === author.id)
            ? current
            : [author, ...current]
        ));
        const message = error instanceof Error
          ? error.message
          : "Не удалось обновить игнор-лист.";
        toast.danger(message);
      });
  }

  return (
    <section className="surface-elevated rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[var(--label-primary)]">
            Игнор-лист
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-[var(--label-secondary)]">
            Посты этих авторов не будут появляться в вашей ленте. Авторы об этом не узнают.
          </p>
        </div>
      </div>

      {authors.length > 0 ? (
        <ul className="mt-5 divide-y divide-[var(--separator)]">
          {authors.map((author) => (
            <li key={author.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  avatarUrl={author.avatarUrl}
                  avatarSeed={author.handle || author.id}
                  name={author.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-[var(--label-primary)]">
                    {author.name}
                  </p>
                  <p className="truncate text-[13px] text-[var(--label-tertiary)]">
                    {author.handle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="interactive-tertiary inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-[var(--label-primary)]"
                onClick={() => handleUnignore(author)}
              >
                <NotIgnoreAuthorIcon />
                <span className="hidden min-[481px]:inline">Не игнорировать</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-[20px] bg-[var(--fill-control-subtle)] px-4 py-4 text-[14px] text-[var(--label-secondary)]">
          Здесь пока никого нет
        </div>
      )}
    </section>
  );
}
