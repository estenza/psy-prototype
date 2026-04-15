"use client";

import { Dropdown, Label } from "@heroui/react";
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
import { buttonClassName } from "@/components/ui/button";
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

  return (
    <div className="surface-primary border-separator relative z-30 border-b px-4 py-2 sm:px-5">
      <div className="relative z-40 flex items-center justify-start gap-0 text-sm">
        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className: "h-10 rounded-full px-3 text-[var(--label-primary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="flex items-center gap-1.5">
              <span>{activeTopicLabel}</span>
              <ChevronDownIcon />
            </span>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-56">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={new Set([activeTopic])}
              onAction={(key) => onTopicChange(String(key) as FeedTopicFilter)}
            >
              {POST_TOPIC_FILTER_OPTIONS.map((option) => (
                <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
                  <Label>{option.label}</Label>
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className: "h-10 rounded-full px-3 text-[var(--label-primary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="flex items-center gap-1.5">
              <span>{sortMode}</span>
              <ChevronDownIcon />
            </span>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-44">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={new Set([sortMode])}
              onAction={(key) => onSortModeChange(String(key) as FeedSortMode)}
            >
              {FEED_SORT_OPTIONS.map((option) => (
                <Dropdown.Item key={option} id={option} textValue={option}>
                  <Label>{option}</Label>
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className: "h-10 min-w-10 rounded-full px-3 text-[var(--label-primary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="flex items-center gap-1">
              <span className="[&_svg]:h-4 [&_svg]:w-4">
                {viewMode === "card" ? <CardModeIcon /> : <CompactModeIcon />}
              </span>
              <ChevronDownIcon />
            </span>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-44">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={new Set([viewMode])}
              onAction={(key) => onViewModeChange(String(key) as ViewMode)}
            >
              {FEED_VIEW_OPTIONS.map((option) => (
                <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
                  <Label className="flex items-center gap-2">
                    {option.value === "card" ? (
                      <CardModeIcon filled={false} />
                    ) : (
                      <CompactModeIcon filled={false} />
                    )}
                    <span>{option.label}</span>
                  </Label>
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>
    </div>
  );
}
