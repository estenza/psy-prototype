"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type CommentRepliesProps = {
  isOpen: boolean;
  children: ReactNode;
};

export function CommentReplies({ isOpen, children }: CommentRepliesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerTopRef = useRef<number | null>(null);
  const previousIsOpenRef = useRef(isOpen);

  useLayoutEffect(() => {
    if (isOpen && !previousIsOpenRef.current && containerRef.current) {
      containerTopRef.current = containerRef.current.getBoundingClientRect().top;
    }

    if (containerTopRef.current === null || !containerRef.current) {
      previousIsOpenRef.current = isOpen;
      return;
    }

    const nextTop = containerRef.current.getBoundingClientRect().top;
    const delta = nextTop - containerTopRef.current;

    if (delta !== 0) {
      window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    }

    containerTopRef.current = null;
    previousIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div ref={containerRef} className="min-w-0">
      <div className="flex min-w-0 flex-col gap-5">
        {children}
      </div>
    </div>
  );
}
