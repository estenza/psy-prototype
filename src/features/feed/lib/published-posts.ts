const HIGHLIGHT_POST_ID_STORAGE_KEY = "psy-prototype:feed:highlight-post-id";
const PUBLISHED_POST_TOAST_STORAGE_KEY = "psy-prototype:feed:published-post-toast";

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

export function markPublishedPostToast(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PUBLISHED_POST_TOAST_STORAGE_KEY, message);
}

export function consumePublishedPostToast() {
  if (typeof window === "undefined") {
    return null;
  }

  const message = window.sessionStorage.getItem(PUBLISHED_POST_TOAST_STORAGE_KEY);

  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(PUBLISHED_POST_TOAST_STORAGE_KEY);

  return message;
}
