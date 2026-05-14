"use client";

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
import { buttonClassName } from "@/components/ui/button-styles";
import { ResponsiveSelectionMenu } from "@/components/ui/responsive-selection-menu";
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
  const activeTopicLabel =
    POST_TOPIC_FILTER_OPTIONS.find((option) => option.value === activeTopic)
      ?.label ?? "Все темы";
  const chevronClassName = "flex h-3 w-3 flex-none items-center justify-center";
  const selectorButtonClassName = buttonClassName({
    className:
      "inline-flex h-10 items-center justify-center rounded-full px-3 text-[var(--label-secondary)]",
    size: "sm",
    variant: "quaternary",
  });

  return (
    <div className="app-feed-toolbar surface-primary border-separator relative z-30 px-0 pb-3 pt-4 min-[480px]:pb-6 min-[480px]:pt-8">
      <div className="relative z-40 flex items-center justify-start gap-0 text-sm">
        <ResponsiveSelectionMenu
          ariaLabel="Фильтр по теме"
          value={activeTopic}
          onChange={(nextTopic) => onTopicChange(nextTopic)}
          options={POST_TOPIC_FILTER_OPTIONS}
          popoverPlacement="bottom start"
          popoverClassName="min-w-56"
          triggerClassName={selectorButtonClassName}
          trigger={(
            <span className="inline-flex items-center leading-none">
              <span>{activeTopicLabel}</span>
              <span className={`ml-1.5 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          )}
        />

        <ResponsiveSelectionMenu
          ariaLabel="Сортировка ленты"
          value={sortMode}
          onChange={(nextSortMode) => onSortModeChange(nextSortMode)}
          options={FEED_SORT_OPTIONS.map((option) => ({ label: option, value: option }))}
          popoverPlacement="bottom start"
          popoverClassName="min-w-44"
          triggerClassName={selectorButtonClassName}
          trigger={(
            <span className="inline-flex items-center leading-none">
              <span>{sortMode}</span>
              <span className={`ml-1.5 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          )}
        />

        <ResponsiveSelectionMenu
          ariaLabel="Вид ленты"
          value={viewMode}
          onChange={(nextViewMode) => onViewModeChange(nextViewMode)}
          options={FEED_VIEW_OPTIONS}
          popoverPlacement="bottom start"
          popoverClassName="min-w-44"
          triggerClassName={buttonClassName({
            className:
              "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[var(--label-secondary)]",
            size: "sm",
            variant: "quaternary",
          })}
          renderOption={(option) => (
            <span className="flex items-center gap-2">
              {option.value === "card" ? (
                <CardModeIcon filled={option.value === viewMode} />
              ) : (
                <CompactModeIcon filled={option.value === viewMode} />
              )}
              <span>{option.label}</span>
            </span>
          )}
          trigger={(
            <span className="inline-flex items-center leading-none">
              <span className="flex h-5 w-5 flex-none items-center justify-center">
                {viewMode === "card" ? <CardModeIcon /> : <CompactModeIcon />}
              </span>
              <span className={`ml-1 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          )}
        />
      </div>
    </div>
  );
}
