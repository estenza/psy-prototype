"use client";

const CREATE_TOPIC_PATH = "/create-topic";
const LOCAL_BASE_URL = "http://localhost";

export function normalizeCreateTopicReturnTo(
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

    if (
      normalizedValue === CREATE_TOPIC_PATH ||
      normalizedValue.startsWith(`${CREATE_TOPIC_PATH}?`) ||
      normalizedValue.startsWith(`${CREATE_TOPIC_PATH}#`)
    ) {
      return null;
    }

    return normalizedValue.startsWith("/") ? normalizedValue : null;
  } catch {
    if (!value.startsWith("/") || value.startsWith("//")) {
      return null;
    }

    if (
      value === CREATE_TOPIC_PATH ||
      value.startsWith(`${CREATE_TOPIC_PATH}?`) ||
      value.startsWith(`${CREATE_TOPIC_PATH}#`)
    ) {
      return null;
    }

    return value;
  }
}

export function buildCreateTopicHref(returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeCreateTopicReturnTo(returnTo);

  if (!normalizedReturnTo) {
    return CREATE_TOPIC_PATH;
  }

  const searchParams = new URLSearchParams({
    returnTo: normalizedReturnTo,
  });

  return `${CREATE_TOPIC_PATH}?${searchParams.toString()}`;
}

export function getCurrentPathWithSearchAndHash() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
