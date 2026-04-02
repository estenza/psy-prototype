import {
  COMMENTS_MAX_FETCH_COUNT,
  COMMENTS_PAGE_SIZE,
} from "@/features/comments/constants";
import { getHyvorServerConfig } from "@/features/comments/lib/hyvor-config";
import type {
  HyvorConsoleComment,
  HyvorDataComment,
  HyvorDataPage,
  HyvorWebsiteSettings,
} from "@/features/comments/lib/hyvor-types";

export class HyvorApiError extends Error {
  status: number;
  method: string;
  url: string;
  responseBody: string;
  contentType: string | null;

  constructor({
    message,
    status,
    method,
    url,
    responseBody,
    contentType,
  }: {
    message: string;
    status: number;
    method: string;
    url: string;
    responseBody: string;
    contentType: string | null;
  }) {
    super(message);
    this.name = "HyvorApiError";
    this.status = status;
    this.method = method;
    this.url = url;
    this.responseBody = responseBody;
    this.contentType = contentType;
  }
}

function buildRefererHeaders(requestReferer: string | null) {
  if (!requestReferer) {
    return undefined;
  }

  return {
    Referer: requestReferer,
  };
}

async function readHyvorResponse<T>(response: Response, requestInfo?: {
  method: string;
  url: string;
}) {
  if (!response.ok) {
    const errorText = await response.text();
    const contentType = response.headers.get("content-type");
    const safeMessage =
      contentType?.includes("application/json")
        ? errorText || `Hyvor request failed with ${response.status}`
        : `Hyvor request failed with ${response.status}`;

    throw new HyvorApiError({
      message: safeMessage,
      status: response.status,
      method: requestInfo?.method ?? "GET",
      url: requestInfo?.url ?? response.url,
      responseBody: errorText,
      contentType,
    });
  }

  return response.json() as Promise<T>;
}

function buildDataApiQuery({
  websiteId,
  apiKey,
  usePublicDataAccess,
  params,
}: {
  websiteId: string;
  apiKey: string | null;
  usePublicDataAccess: boolean;
  params: Record<string, string>;
}) {
  const query = new URLSearchParams({
    website_id: websiteId,
    ...params,
  });

  if (apiKey && !usePublicDataAccess) {
    query.set("api_key", apiKey);
  }

  return query;
}

async function fetchHyvorDataApi<T>({
  path,
  params,
  requestReferer,
}: {
  path: string;
  params: Record<string, string>;
  requestReferer: string | null;
}) {
  const config = getHyvorServerConfig();

  async function performRequest(withApiKey: boolean) {
    const query = buildDataApiQuery({
      websiteId: config.websiteId,
      apiKey: withApiKey ? config.dataApiKey : null,
      usePublicDataAccess: config.usePublicDataAccess || !withApiKey,
      params,
    });
    const url = `${config.dataApiBaseUrl}/${path}?${query.toString()}`;

    return fetch(url, {
      headers: buildRefererHeaders(requestReferer),
      next: {
        revalidate: 30,
      },
    });
  }

  const shouldTryApiKeyFirst = Boolean(
    config.dataApiKey && !config.usePublicDataAccess,
  );

  const firstResponse = await performRequest(shouldTryApiKeyFirst);

  if (firstResponse.ok) {
    return readHyvorResponse<T>(firstResponse, {
      method: "GET",
      url: firstResponse.url,
    });
  }

  const firstErrorText = await firstResponse.text();
  const shouldRetryWithoutApiKey =
    shouldTryApiKeyFirst &&
    firstResponse.status === 422 &&
    /invalid api key/i.test(firstErrorText);

  if (!shouldRetryWithoutApiKey) {
    throw new Error(
      firstErrorText || `Hyvor request failed with ${firstResponse.status}`,
    );
  }

  const secondResponse = await performRequest(false);

  return readHyvorResponse<T>(secondResponse, {
    method: "GET",
    url: secondResponse.url,
  });
}

export async function fetchHyvorPageByIdentifier(
  pageIdentifier: string,
  requestReferer: string | null,
) {
  const pages = await fetchHyvorDataApi<HyvorDataPage[]>({
    path: "pages",
    requestReferer,
    params: {
      limit: "1",
      filter: `identifier='${pageIdentifier.replace(/'/g, "\\'")}'`,
    },
  });

  return pages[0] ?? null;
}

export async function fetchAllHyvorComments(
  pageId: number,
  requestReferer: string | null,
) {
  const comments: HyvorDataComment[] = [];

  for (
    let offset = 0;
    offset < COMMENTS_MAX_FETCH_COUNT;
    offset += COMMENTS_PAGE_SIZE
  ) {
    const batch = await fetchHyvorDataApi<HyvorDataComment[]>({
      path: "comments",
      requestReferer,
      params: {
        limit: String(COMMENTS_PAGE_SIZE),
        offset: String(offset),
        filter: `page_id=${pageId}`,
        sort: "created_at ASC",
      },
    });

    comments.push(...batch);

    if (batch.length < COMMENTS_PAGE_SIZE) {
      break;
    }
  }

  return comments;
}

export async function fetchHyvorWebsiteSettings() {
  const config = getHyvorServerConfig();

  if (!config.consoleApiKey) {
    return null;
  }

  const url = `${config.consoleApiBaseUrl}/${config.websiteId}/website`;
  const response = await fetch(url, {
    headers: {
      "X-API-KEY": config.consoleApiKey,
    },
    next: {
      revalidate: 60,
    },
  });

  return readHyvorResponse<HyvorWebsiteSettings>(response, {
    method: "GET",
    url,
  });
}

export async function postHyvorComment({
  pageIdentifier,
  bodyHtml,
  parentId,
  viewer,
}: {
  pageIdentifier: string;
  bodyHtml: string;
  parentId?: number | null;
  viewer?: ReturnType<typeof getHyvorServerConfig>["viewer"];
}) {
  const config = getHyvorServerConfig(viewer);

  if (!config.consoleApiKey) {
    throw new Error("HYVOR_CONSOLE_API_KEY is required for posting comments.");
  }

  const response = await fetch(
    `${config.consoleApiBaseUrl}/${config.websiteId}/comment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": config.consoleApiKey,
      },
      body: JSON.stringify({
        page_identifier: pageIdentifier,
        parent_id: parentId ?? null,
        body_html: bodyHtml,
        guest_name: config.viewer.displayName,
        guest_email: null,
      }),
    },
  );

  return readHyvorResponse<HyvorConsoleComment>(response, {
    method: "POST",
    url: `${config.consoleApiBaseUrl}/${config.websiteId}/comment`,
  });
}

export async function voteHyvorComment(commentId: number, type: "up" | "down" | null) {
  const config = getHyvorServerConfig();

  if (!config.consoleApiKey) {
    throw new Error("HYVOR_CONSOLE_API_KEY is required for voting.");
  }

  const response = await fetch(
    `${config.consoleApiBaseUrl}/${config.websiteId}/comment/${commentId}/vote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": config.consoleApiKey,
      },
      body: JSON.stringify({
        type,
        user_sso_id: null,
      }),
    },
  );

  await readHyvorResponse(response, {
    method: "POST",
    url: `${config.consoleApiBaseUrl}/${config.websiteId}/comment/${commentId}/vote`,
  });
}

export async function reportHyvorComment(commentId: number, reason: string | null) {
  const config = getHyvorServerConfig();

  if (!config.consoleApiKey) {
    throw new Error("HYVOR_CONSOLE_API_KEY is required for flagging.");
  }

  const response = await fetch(
    `${config.consoleApiBaseUrl}/${config.websiteId}/comment/${commentId}/flags`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": config.consoleApiKey,
      },
      body: JSON.stringify({
        reason,
        user_sso_id: null,
      }),
    },
  );

  await readHyvorResponse(response, {
    method: "POST",
    url: `${config.consoleApiBaseUrl}/${config.websiteId}/comment/${commentId}/flags`,
  });
}
