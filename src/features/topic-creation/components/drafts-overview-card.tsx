"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatDraftTimeLabel,
  hasMeaningfulTopicDraft,
  readStoredTopicDraft,
  requestTopicDraftRestore,
} from "@/features/topic-creation/lib/draft-storage";

export function DraftsOverviewCard() {
  const router = useRouter();
  const [draft] = useState(() => readStoredTopicDraft());

  const hasDraft = useMemo(() => {
    if (!draft) {
      return false;
    }

    return hasMeaningfulTopicDraft(draft);
  }, [draft]);

  const draftTitle = draft?.title.trim() || "Без названия";

  return (
    <section className="surface-elevated border-separator rounded-[28px] border p-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
          Локальные черновики
        </h2>
        <p className="text-[14px] leading-6 text-[var(--label-secondary)]">
          Черновики в этом прототипе сохраняются в браузере на текущем устройстве.
        </p>
      </div>

      <div className="mt-5 rounded-[24px] bg-[var(--fill-quaternary)] px-4 py-4">
        {hasDraft ? (
          <>
            <div className="text-[16px] font-semibold text-[var(--label-primary)]">
              {draftTitle}
            </div>
            <div className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
              {formatDraftTimeLabel(draft?.updatedAt ?? null)}
            </div>
          </>
        ) : (
          <>
            <div className="text-[16px] font-semibold text-[var(--label-primary)]">
              Сохранённых черновиков пока нет
            </div>
            <div className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
              Как только вы начнёте писать обсуждение и закроете редактор, здесь появится быстрый доступ к восстановлению.
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            if (hasDraft) {
              requestTopicDraftRestore();
            }

            router.push("/create-topic");
          }}
          className="interactive-secondary inline-flex cursor-pointer items-center rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          {hasDraft ? "Открыть черновик" : "Создать обсуждение"}
        </button>
      </div>
    </section>
  );
}
