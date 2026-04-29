"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { POST_TOPIC_SUBTOPICS } from "@/constants/post-taxonomy";
import type { PostTopic } from "@/types/post-taxonomy";

type TopicSubtopicPickerProps = {
  onChange: (nextSubtopic: string) => void;
  topic: PostTopic;
  value: string;
};

const FALLBACK_COLLAPSED_VISIBLE_COUNT = 5;
const COLLAPSED_MAX_ROWS = 2;
const CHIP_GAP_PX = 8;
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function getChipClassName(isSelected: boolean) {
  return `inline-flex min-h-8 max-w-full min-w-0 items-center rounded-full px-3.5 py-1.5 text-left text-[14px] leading-5 font-normal whitespace-nowrap transition-[color,background-color] duration-200 ease-out ${
    isSelected
      ? "bg-[color-mix(in_oklab,var(--accent-primary)_12%,transparent)] !text-[var(--accent-primary)] opacity-100 hover:bg-[color-mix(in_oklab,var(--accent-primary)_16%,transparent)] hover:!text-[var(--accent-primary)]"
      : "bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] text-[var(--label-secondary)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]"
  }`.trim();
}

function getRowCount(widths: number[], containerWidth: number) {
  if (widths.length === 0) {
    return 0;
  }

  let rowCount = 1;
  let currentRowWidth = 0;

  widths.forEach((width) => {
    if (currentRowWidth === 0) {
      currentRowWidth = width;
      return;
    }

    if (currentRowWidth + CHIP_GAP_PX + width <= containerWidth + 0.5) {
      currentRowWidth += CHIP_GAP_PX + width;
      return;
    }

    rowCount += 1;
    currentRowWidth = width;
  });

  return rowCount;
}

function getCollapsedVisibleCount({
  chipWidths,
  containerWidth,
  moreButtonWidth,
  subtopicCount,
  topic,
}: {
  chipWidths: number[];
  containerWidth: number;
  moreButtonWidth: number;
  subtopicCount: number;
  topic: PostTopic;
}) {
  const minimumWideVisibleCount =
    topic === "relationships" && containerWidth >= 560 ? 6 : 0;

  if (
    containerWidth <= 0
    || moreButtonWidth <= 0
    || chipWidths.length !== subtopicCount
  ) {
    return Math.min(
      Math.max(FALLBACK_COLLAPSED_VISIBLE_COUNT, minimumWideVisibleCount),
      subtopicCount,
    );
  }

  if (getRowCount(chipWidths, containerWidth) <= COLLAPSED_MAX_ROWS) {
    return subtopicCount;
  }

  for (let count = subtopicCount - 1; count > 0; count -= 1) {
    const rowCount = getRowCount(
      [...chipWidths.slice(0, count), moreButtonWidth],
      containerWidth,
    );

    if (rowCount <= COLLAPSED_MAX_ROWS) {
      return Math.min(Math.max(count, minimumWideVisibleCount), subtopicCount);
    }
  }

  return Math.min(Math.max(1, minimumWideVisibleCount), subtopicCount);
}

export function TopicSubtopicPicker({
  onChange,
  topic,
  value,
}: TopicSubtopicPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chipMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const moreMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [expansionState, setExpansionState] = useState<{
    isExpanded: boolean;
    topic: PostTopic;
  }>({
    isExpanded: false,
    topic,
  });
  const [collapsedVisibleCount, setCollapsedVisibleCount] = useState(
    FALLBACK_COLLAPSED_VISIBLE_COUNT,
  );
  const subtopics = useMemo(() => POST_TOPIC_SUBTOPICS[topic] ?? [], [topic]);
  const isExpanded = expansionState.topic === topic && expansionState.isExpanded;
  const visibleCount = Math.min(collapsedVisibleCount, subtopics.length);
  const hasOverflow = subtopics.length > visibleCount;
  const visibleSubtopics = isExpanded || !hasOverflow
    ? subtopics
    : subtopics.slice(0, visibleCount);

  useIsomorphicLayoutEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement) {
      return;
    }

    const observedElement = containerElement;

    function updateVisibleCount() {
      const nextVisibleCount = getCollapsedVisibleCount({
        chipWidths: chipMeasureRefs.current.map((element) =>
          element?.getBoundingClientRect().width ?? 0,
        ),
        containerWidth: observedElement.getBoundingClientRect().width,
        moreButtonWidth: moreMeasureRef.current?.getBoundingClientRect().width ?? 0,
        subtopicCount: subtopics.length,
        topic,
      });

      setCollapsedVisibleCount((currentVisibleCount) =>
        currentVisibleCount === nextVisibleCount
          ? currentVisibleCount
          : nextVisibleCount,
      );
    }

    updateVisibleCount();
    const animationFrameId = window.requestAnimationFrame(updateVisibleCount);

    const resizeObserver = new ResizeObserver(updateVisibleCount);
    resizeObserver.observe(observedElement);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [subtopics, topic]);

  if (subtopics.length === 0) {
    return null;
  }

  function toggleSubtopic(subtopic: string) {
    if (value === subtopic) {
      return;
    }

    onChange(subtopic);
  }

  return (
    <div
      className="relative"
    >
      <div
        ref={containerRef}
        className={`flex flex-wrap gap-2 ${
          isExpanded ? "" : "max-h-[72px] overflow-hidden"
        }`.trim()}
        role="group"
        aria-label="Подтемы"
      >
        {visibleSubtopics.map((subtopic) => {
          const isSelected = value === subtopic;

          return (
            <button
              key={subtopic}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleSubtopic(subtopic)}
              className={getChipClassName(isSelected)}
            >
              <span className="min-w-0 truncate">{subtopic}</span>
            </button>
          );
        })}

        {hasOverflow && !isExpanded ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Скрыть дополнительные подтемы" : "Показать дополнительные подтемы"}
            onClick={() => {
              setExpansionState((current) => ({
                isExpanded: current.topic === topic ? !current.isExpanded : true,
                topic,
              }));
            }}
            className={`${getChipClassName(false)} min-w-12 justify-center px-4`}
          >
            ...
          </button>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-2 opacity-0"
      >
        {subtopics.map((subtopic, index) => (
          <span
            key={subtopic}
            ref={(element) => {
              chipMeasureRefs.current[index] = element;
            }}
            className={getChipClassName(false)}
          >
            <span className="min-w-0 truncate">{subtopic}</span>
          </span>
        ))}
        <span
          ref={moreMeasureRef}
          className={`${getChipClassName(false)} min-w-12 justify-center px-4`}
        >
          ...
        </span>
      </div>
    </div>
  );
}
