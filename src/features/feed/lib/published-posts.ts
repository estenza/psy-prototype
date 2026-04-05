const HIGHLIGHT_POST_ID_STORAGE_KEY = "psy-prototype:feed:highlight-post-id";

export function readHighlightedPublishedPostId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(HIGHLIGHT_POST_ID_STORAGE_KEY);
}

export function clearHighlightedPublishedPostId() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(HIGHLIGHT_POST_ID_STORAGE_KEY);
}

export function markPublishedPostForHighlight(postId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(HIGHLIGHT_POST_ID_STORAGE_KEY, postId);
}
