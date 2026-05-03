"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const VIEW_VISIBILITY_THRESHOLD = 0.5;

function sendPostView(postId: string) {
  void fetch(`/api/posts/${postId}/view`, {
    method: "POST",
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // View counts are non-critical analytics; ignore transient network failures.
  });
}

export function usePostViewTracker<TElement extends Element>(
  postId: string | null | undefined,
): RefObject<TElement | null> {
  const elementRef = useRef<TElement | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    recordedRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (!postId || recordedRef.current) {
      return;
    }

    const element = elementRef.current;

    if (!element) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      recordedRef.current = true;
      sendPostView(postId);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some(
          (entry) =>
            entry.isIntersecting
            && entry.intersectionRatio >= VIEW_VISIBILITY_THRESHOLD,
        );

        if (!isVisible || recordedRef.current) {
          return;
        }

        recordedRef.current = true;
        observer.disconnect();
        sendPostView(postId);
      },
      {
        threshold: [VIEW_VISIBILITY_THRESHOLD],
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [postId]);

  return elementRef;
}
