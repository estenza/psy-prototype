"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownSmallIcon, SortCommentsIcon } from "@/components/ui/icons";
import { COMMENTS_SORT_OPTIONS } from "@/features/comments/constants";
import type { CommentsSortValue } from "@/features/comments/types";

type CommentsSortControlProps = {
  value: CommentsSortValue;
  onChange: (value: CommentsSortValue) => void;
};

export function CommentsSortControl({
  value,
  onChange,
}: CommentsSortControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const eventTarget = event.target;

      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(eventTarget)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="comment-sort-button text-label-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-[13.6px] leading-5"
        onClick={() => setIsOpen((currentState) => !currentState)}
      >
        <SortCommentsIcon />
        <span>Упорядочить</span>
        <ChevronDownSmallIcon />
      </button>

      {isOpen ? (
        <div className="surface-elevated border-separator absolute right-0 top-[calc(100%+8px)] z-30 min-w-[182px] rounded-[18px] border p-1 shadow-[0_14px_32px_rgba(0,0,0,0.08)]">
          {COMMENTS_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`comment-menu-item w-full justify-start rounded-[14px] px-3 py-2.5 text-left text-[13px] leading-4 ${
                option.value === value ? "font-semibold text-[var(--label-primary)]" : "text-[var(--label-secondary)]"
              }`.trim()}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
