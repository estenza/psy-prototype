export type YandexDirectAuthState = {
  isPublishingFlow: boolean;
  nextHref: string;
};

const YANDEX_DIRECT_AUTH_STATE_PREFIX = "vnutri-direct:";

function normalizeNextHref(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
export function encodeYandexDirectAuthState(state: YandexDirectAuthState) {
  return `${YANDEX_DIRECT_AUTH_STATE_PREFIX}${encodeURIComponent(
    JSON.stringify({
      isPublishingFlow: state.isPublishingFlow,
      nextHref: normalizeNextHref(state.nextHref),
    }),
  )}`;
}

export function decodeYandexDirectAuthState(
  value: string | null | undefined,
): YandexDirectAuthState | null {
  if (!value?.startsWith(YANDEX_DIRECT_AUTH_STATE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeURIComponent(value.slice(YANDEX_DIRECT_AUTH_STATE_PREFIX.length)),
    ) as Partial<YandexDirectAuthState>;

    return {
      isPublishingFlow: payload.isPublishingFlow === true,
      nextHref: normalizeNextHref(payload.nextHref),
    };
  } catch {
    return null;
  }
}
