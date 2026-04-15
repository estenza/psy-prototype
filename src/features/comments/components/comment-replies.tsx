"use client";

import type { ReactNode } from "react";
import { ChevronDownSmallIcon, ChevronUpSmallIcon } from "@/components/ui/icons";

type CommentRepliesProps = {
  replyCount: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CommentReplies({
  replyCount,
  isOpen,
  onToggle,
  children,
}: CommentRepliesProps) {
  if (replyCount === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {isOpen ? (
        <>
          <div className="flex w-full items-start">
            <div className="comment-thread-gutter relative h-full w-9 shrink-0">
              <div className="comment-thread-corner absolute left-1/2 right-0 top-0 h-6" />
              <div className="comment-thread-rail absolute bottom-0 left-1/2 right-0 top-0" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 pl-3 pt-3">
              {children}
            </div>
          </div>

          <div className="flex w-full items-start">
            <div className="comment-thread-gutter relative h-12 w-9 shrink-0">
              <div className="comment-thread-corner absolute left-1/2 right-0 top-0 h-[30px]" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center pt-3">
              <button
                type="button"
                className="interactive-tertiary text-label-primary inline-flex h-9 items-center rounded-full px-4 text-[14px] font-medium leading-9"
                onClick={onToggle}
              >
                Скрыть ответы
                <span className="ml-1 inline-flex">
                  <ChevronUpSmallIcon />
                </span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex w-full items-start">
          <div className="comment-thread-gutter relative h-12 w-9 shrink-0">
            <div className="comment-thread-corner absolute left-1/2 right-0 top-0 h-[30px]" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center pt-3">
            <button
              type="button"
              className="interactive-tertiary text-label-primary inline-flex h-9 items-center rounded-full px-4 text-[14px] font-medium leading-9"
              onClick={onToggle}
            >
              Показать ответы ({replyCount})
              <span className="ml-1 inline-flex">
                <ChevronDownSmallIcon />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
