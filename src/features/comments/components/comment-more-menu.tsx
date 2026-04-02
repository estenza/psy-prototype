"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type CommentMoreMenuProps = {
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isViewerAuthenticated: boolean;
  viewerOwnsComment: boolean;
  onBlock: () => void;
  onReport: () => void;
};

export function CommentMoreMenu({
  canReport,
  canEdit,
  canDelete,
  isViewerAuthenticated,
  viewerOwnsComment,
  onBlock,
  onReport,
}: CommentMoreMenuProps) {
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

  const items =
    isViewerAuthenticated && viewerOwnsComment
      ? [
          {
            label: "Редактировать",
            disabled: !canEdit,
            onSelect: () => undefined,
          },
          {
            label: "Удалить",
            disabled: !canDelete,
            onSelect: () => undefined,
          },
        ]
      : [
          {
            label: "Пожаловаться",
            disabled: !canReport,
            onSelect: onReport,
          },
          {
            label: "Заблокировать",
            disabled: false,
            onSelect: onBlock,
          },
        ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="comment-icon-button text-label-secondary inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
        onClick={() => setIsOpen((currentState) => !currentState)}
        aria-label="Открыть меню действий"
      >
        <MoreHorizontalIcon />
      </button>

      {isOpen ? (
        <div className="surface-elevated border-separator absolute right-0 top-[calc(100%+4px)] z-30 min-w-[188px] rounded-[18px] border p-1 shadow-[0_14px_32px_rgba(0,0,0,0.08)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="comment-menu-item w-full justify-start rounded-[14px] px-3 py-2.5 text-left text-[13px] leading-4"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
