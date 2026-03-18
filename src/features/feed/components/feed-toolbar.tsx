"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FEED_SORT_MODE,
  FEED_SORT_OPTIONS,
  FEED_VIEW_OPTIONS,
} from "@/constants/feed";
import {
  CardModeIcon,
  CardViewIcon,
  ChevronDownIcon,
  CompactModeIcon,
  CompactViewIcon,
  ForumModeIcon,
  ForumViewIcon,
} from "@/components/ui/icons";
import type { FeedSortMode, ViewMode } from "@/types/feed";

type FeedToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
};

export function FeedToolbar({
  viewMode,
  onViewModeChange,
}: FeedToolbarProps) {
  const [openMenu, setOpenMenu] = useState<"sort" | "view" | null>(null);
  const [sortMode, setSortMode] = useState<FeedSortMode>(
    DEFAULT_FEED_SORT_MODE,
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const activeRef =
        openMenu === "sort"
          ? sortMenuRef.current
          : openMenu === "view"
            ? viewMenuRef.current
            : null;

      if (activeRef && !activeRef.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [openMenu]);

  return (
    <>
      {openMenu ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setOpenMenu(null)}
          className="fixed inset-0 z-20 cursor-default bg-transparent"
        />
      ) : null}

      <div className="surface-primary border-separator relative z-30 border-b px-4 py-2 sm:px-5">
        <div className="text-label-secondary relative z-40 flex items-center justify-start gap-1 text-sm">
          <div ref={sortMenuRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((current) => (current === "sort" ? null : "sort"))
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-[var(--fill-control-hover)] hover:text-[var(--label-primary)]"
            >
              <span>{sortMode}</span>
              <ChevronDownIcon />
            </button>
            {openMenu === "sort" ? (
              <div className="surface-primary border-separator absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border p-1 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                <div className="text-label-tertiary px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Сортировка
                </div>
                {FEED_SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSortMode(option);
                      setOpenMenu(null);
                    }}
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-[var(--fill-control-hover)] ${
                      sortMode === option
                        ? "font-semibold text-[var(--label-primary)]"
                        : "font-normal text-[var(--label-secondary)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={viewMenuRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((current) => (current === "view" ? null : "view"))
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-[var(--fill-control-hover)] hover:text-[var(--label-primary)]"
            >
              {viewMode === "card" ? (
                <CardViewIcon />
              ) : viewMode === "compact" ? (
                <CompactViewIcon />
              ) : (
                <ForumViewIcon />
              )}
              <ChevronDownIcon />
            </button>
            {openMenu === "view" ? (
              <div className="surface-primary border-separator absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border p-1 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                <div className="text-label-tertiary px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Вид
                </div>
                {FEED_VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onViewModeChange(option.value);
                      setOpenMenu(null);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--fill-control-hover)] ${
                      viewMode === option.value
                        ? "font-semibold text-[var(--label-primary)]"
                        : "font-normal text-[var(--label-secondary)]"
                    }`}
                  >
                    {option.value === "card" ? (
                      <CardModeIcon filled={viewMode === option.value} />
                    ) : option.value === "compact" ? (
                      <CompactModeIcon filled={viewMode === option.value} />
                    ) : (
                      <ForumModeIcon filled={viewMode === option.value} />
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
