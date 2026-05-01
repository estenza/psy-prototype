"use client";

import { Dropdown, Label } from "@heroui/react";
import { POST_TOPIC_FILTER_OPTIONS } from "@/constants/post-taxonomy";
import {
  FEED_SORT_OPTIONS,
  FEED_VIEW_OPTIONS,
} from "@/features/feed/constants/feed";
import {
  CardModeIcon,
  CheckIndicatorIcon,
  ChevronDownIcon,
  CompactModeIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
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

  return (
    <div className="app-feed-toolbar surface-primary border-separator relative z-30 px-0 pb-3 pt-6">
      <div className="relative z-40 flex items-center justify-start gap-0 text-sm">
        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className:
                "inline-flex h-10 items-center justify-center rounded-full px-3 text-[var(--label-secondary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="inline-flex items-center leading-none">
              <span>{activeTopicLabel}</span>
              <span className={`ml-1.5 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          </Dropdown.Trigger>
          <DropdownPopover placement="bottom start" className="min-w-56">
            <Dropdown.Menu
              className="dropdown-menu-default"
              selectionMode="single"
              selectedKeys={new Set([activeTopic])}
              onAction={(key) => onTopicChange(String(key) as FeedTopicFilter)}
            >
              {POST_TOPIC_FILTER_OPTIONS.map((option) => (
                <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
                  <Label>{option.label}</Label>
                  <Dropdown.ItemIndicator className="text-[var(--accent-primary)]">
                    {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                  </Dropdown.ItemIndicator>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </DropdownPopover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className:
                "inline-flex h-10 items-center justify-center rounded-full px-3 text-[var(--label-secondary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="inline-flex items-center leading-none">
              <span>{sortMode}</span>
              <span className={`ml-1.5 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          </Dropdown.Trigger>
          <DropdownPopover placement="bottom start" className="min-w-44">
            <Dropdown.Menu
              className="dropdown-menu-default"
              selectionMode="single"
              selectedKeys={new Set([sortMode])}
              onAction={(key) => onSortModeChange(String(key) as FeedSortMode)}
            >
              {FEED_SORT_OPTIONS.map((option) => (
                <Dropdown.Item key={option} id={option} textValue={option}>
                  <Label>{option}</Label>
                  <Dropdown.ItemIndicator className="text-[var(--accent-primary)]">
                    {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                  </Dropdown.ItemIndicator>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </DropdownPopover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.Trigger
            className={buttonClassName({
              className:
                "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[var(--label-secondary)]",
              size: "sm",
              variant: "tertiary",
            })}
          >
            <span className="inline-flex items-center leading-none">
              <span className="flex h-5 w-5 flex-none items-center justify-center">
                {viewMode === "card" ? <CardModeIcon /> : <CompactModeIcon />}
              </span>
              <span className={`ml-1 ${chevronClassName}`}>
                <ChevronDownIcon />
              </span>
            </span>
          </Dropdown.Trigger>
          <DropdownPopover placement="bottom start" className="min-w-44">
            <Dropdown.Menu
              className="dropdown-menu-default"
              selectionMode="single"
              selectedKeys={new Set([viewMode])}
              onAction={(key) => onViewModeChange(String(key) as ViewMode)}
            >
              {FEED_VIEW_OPTIONS.map((option) => (
                <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
                  <Label className="flex items-center gap-2">
                    {option.value === "card" ? (
                      <CardModeIcon filled={option.value === viewMode} />
                    ) : (
                      <CompactModeIcon filled={option.value === viewMode} />
                    )}
                    <span>{option.label}</span>
                  </Label>
                  <Dropdown.ItemIndicator className="text-[var(--accent-primary)]">
                    {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                  </Dropdown.ItemIndicator>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </DropdownPopover>
        </Dropdown.Root>
      </div>
    </div>
  );
}
