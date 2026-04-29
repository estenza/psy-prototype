const LOCAL_BASE_URL = "http://localhost";

export function normalizePostReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = new URL(value, LOCAL_BASE_URL);

    if (parsedValue.origin !== LOCAL_BASE_URL) {
      return null;
    }

    const normalizedValue = `${parsedValue.pathname}${parsedValue.search}${parsedValue.hash}`;

    return normalizedValue.startsWith("/") ? normalizedValue : null;
  } catch {
    if (!value.startsWith("/") || value.startsWith("//")) {
      return null;
    }

    return value;
  }
}

export function buildPostHref(
  postId: string,
  returnTo: string | null | undefined,
  commentId?: string | null,
) {
  const pathname = `/posts/${postId}`;
  const normalizedReturnTo = normalizePostReturnTo(returnTo);
  const normalizedCommentId = commentId?.trim() ?? "";

  if (!normalizedReturnTo && !normalizedCommentId) {
    return pathname;
  }

  const searchParams = new URLSearchParams();

  if (normalizedReturnTo) {
    searchParams.set("returnTo", normalizedReturnTo);
  }

  if (normalizedCommentId) {
    searchParams.set("commentId", normalizedCommentId);
  }

  return `${pathname}?${searchParams.toString()}`;
}
