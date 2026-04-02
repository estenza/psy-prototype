"use client";

import { useEffect, useRef, useState } from "react";
import { POST_TOPIC_FILTER_OPTIONS } from "@/constants/post-taxonomy";
import {
  FEED_SORT_OPTIONS,
  FEED_VIEW_OPTIONS,
} from "@/features/feed/constants/feed";
import {
  CardModeIcon,
  ChevronDownIcon,
  CompactModeIcon,
} from "@/components/ui/icons";
import type {
  FeedSortMode,
  FeedTopicFilter,
  ViewMode,
} from "@/features/feed/types";

type FeedToolbarProps = {
  activeTopic: FeedTopicFilter;
  sortMode: FeedSortMode;
  viewMode: ViewMode;
  onTopicChange: (topic: FeedTopicFilter) => void;
  onSortModeChange: (sortMode: FeedSortMode) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
};

export function FeedToolbar({
  activeTopic,
  onTopicChange,
  sortMode,
  viewMode,
  onSortModeChange,
  onViewModeChange,
}: FeedToolbarProps) {
  const [openMenu, setOpenMenu] = useState<"sort" | "topic" | "view" | null>(
    null,
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const topicMenuRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTopicLabel =
    POST_TOPIC_FILTER_OPTIONS.find((option) => option.value === activeTopic)
      ?.label ?? "Все темы";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const activeRef =
        openMenu === "sort"
          ? sortMenuRef.current
          : openMenu === "topic"
            ? topicMenuRef.current
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
    <div className="surface-primary border-separator relative z-30 border-b px-4 py-2 sm:px-5">
      <div className="text-label-secondary relative z-40 flex items-center justify-start gap-0 text-sm">
        <div ref={topicMenuRef} className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu((current) => (current === "topic" ? null : "topic"))
            }
            className="interactive-control flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2"
          >
            <span>{activeTopicLabel}</span>
            <ChevronDownIcon />
          </button>
          {openMenu === "topic" ? (
            <div className="surface-primary border-separator absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border p-1">
              <div className="text-label-tertiary px-3 pb-1 pt-2 text-[12px] font-semibold uppercase">
                Темы
              </div>
              {POST_TOPIC_FILTER_OPTIONS.map((option) => {
                const isActive = option.value === activeTopic;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onTopicChange(option.value);
                      setOpenMenu(null);
                    }}
                    className={`interactive-control flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                      isActive
                        ? "font-semibold text-[var(--label-primary)]"
                        : "font-normal text-[var(--label-secondary)]"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`text-label-primary text-sm leading-none ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden={!isActive}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div ref={sortMenuRef} className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu((current) => (current === "sort" ? null : "sort"))
            }
            className="interactive-control flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2"
          >
            <span>{sortMode}</span>
            <ChevronDownIcon />
          </button>
          {openMenu === "sort" ? (
            <div className="surface-primary border-separator absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border p-1">
              <div className="text-label-tertiary px-3 pb-1 pt-2 text-[12px] font-semibold uppercase">
                Сортировка
              </div>
              {FEED_SORT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onSortModeChange(option);
                    setOpenMenu(null);
                  }}
                  className={`interactive-control block w-full cursor-pointer rounded-lg px-3 py-2 text-left ${
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
            className="interactive-control flex cursor-pointer items-center gap-1 rounded-full px-3 py-2"
          >
            <span className="text-label-tertiary [&_svg]:h-4 [&_svg]:w-4">
              {viewMode === "card" ? (
                <CardModeIcon />
              ) : (
                <CompactModeIcon />
              )}
            </span>
            <ChevronDownIcon />
          </button>
          {openMenu === "view" ? (
            <div className="surface-primary border-separator absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border p-1">
              <div className="text-label-tertiary px-3 pb-1 pt-2 text-[12px] font-semibold uppercase">
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
                  className={`interactive-control flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left ${
                    viewMode === option.value
                      ? "font-semibold text-[var(--label-primary)]"
                      : "font-normal text-[var(--label-secondary)]"
                  }`}
                >
                  {option.value === "card" ? (
                    <CardModeIcon filled={viewMode === option.value} />
                  ) : (
                    <CompactModeIcon filled={viewMode === option.value} />
                  )}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
