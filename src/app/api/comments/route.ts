import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildCommentsCapabilities, buildCommentsViewer, getHyvorServerConfig } from "@/features/comments/lib/hyvor-config";
import { buildCommentsSectionData } from "@/features/comments/lib/hyvor-adapter";
import { plainTextToHtml } from "@/features/comments/lib/comment-format";
import { fetchAllHyvorComments, fetchHyvorPageByIdentifier, fetchHyvorWebsiteSettings, HyvorApiError, postHyvorComment } from "@/features/comments/lib/hyvor-api";
import type {
  CommentsResponsePayload,
  CommentsSortValue,
  CreateCommentPayload,
  CreateCommentResult,
} from "@/features/comments/types";

function getUrlOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getHyvorRequestContext(request: NextRequest) {
  const requestReferer = request.headers.get("referer");
  const requestOrigin =
    request.headers.get("origin") ??
    getUrlOrigin(requestReferer) ??
    request.nextUrl.origin;

  return {
    requestOrigin,
    requestReferer,
  };
}

function logRouteError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  if (error instanceof HyvorApiError) {
    console.error(`[api/comments][${scope}] HyvorApiError`, {
      ...extra,
      message: error.message,
      method: error.method,
      url: error.url,
      status: error.status,
      contentType: error.contentType,
      responseBodyPreview: error.responseBody.slice(0, 500),
    });
    return;
  }

  console.error(`[api/comments][${scope}]`, {
    ...extra,
    error,
  });
}

function buildRouteErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof HyvorApiError) {
    return NextResponse.json(
      {
        error: fallbackMessage,
        upstream: {
          provider: "hyvor",
          method: error.method,
          url: error.url,
          status: error.status,
          contentType: error.contentType,
          message:
            error.contentType?.includes("application/json")
              ? error.responseBody
              : "Hyvor returned a non-JSON error response.",
        },
      },
      {
        status: error.status >= 400 && error.status < 600 ? error.status : 502,
      },
    );
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      details:
        error instanceof Error ? error.message : "Unknown server error",
    },
    {
      status: 500,
    },
  );
}

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get("pageId")?.trim();
  const sortParam = request.nextUrl.searchParams.get("sort");
  const sort: CommentsSortValue = sortParam === "newest" ? "newest" : "top";

  if (!pageId) {
    return NextResponse.json(
      {
        error: "pageId is required.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const currentUser = await getCurrentUser();
    const config = getHyvorServerConfig(buildCommentsViewer(currentUser));
    const websiteSettings = await fetchHyvorWebsiteSettings().catch(() => null);
    const capabilities = buildCommentsCapabilities(config, websiteSettings);
    const requestContext = getHyvorRequestContext(request);
    const page = await fetchHyvorPageByIdentifier(pageId, requestContext);
    const comments = page
      ? await fetchAllHyvorComments(page.id, requestContext)
      : [];

    const payload: CommentsResponsePayload = {
      data: buildCommentsSectionData({
        pageId,
        page,
        comments,
        sort,
        viewer: config.viewer,
        capabilities,
      }),
    };

    return NextResponse.json(payload);
  } catch (error) {
    const currentUser = await getCurrentUser();
    const config = getHyvorServerConfig(buildCommentsViewer(currentUser));
    const websiteSettings = await fetchHyvorWebsiteSettings().catch(() => null);
    const capabilities = buildCommentsCapabilities(config, websiteSettings);
    logRouteError("GET", error, {
      pageId,
      sort,
    });

    return NextResponse.json(
      {
        error: "Failed to load comments from Hyvor Talk.",
        data: buildCommentsSectionData({
          pageId,
          page: null,
          comments: [],
          sort,
          viewer: config.viewer,
          capabilities,
        }),
      },
      {
        status: 502,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreateCommentPayload;
    const body = payload.body?.trim();
    const currentUser = await getCurrentUser();
    const config = getHyvorServerConfig(buildCommentsViewer(currentUser));
    const websiteSettings = await fetchHyvorWebsiteSettings();
    const capabilities = buildCommentsCapabilities(config, websiteSettings);

    if (!payload.pageId?.trim()) {
      return NextResponse.json(
        {
          error: "pageId is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!body) {
      return NextResponse.json(
        {
          error: "Comment body is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!capabilities.canPost) {
      return NextResponse.json(
        {
          error:
            capabilities.postDisabledReason ??
            "Posting is not available for the current Hyvor configuration.",
          capabilities,
        },
        {
          status: 409,
        },
      );
    }

    const createdComment = await postHyvorComment({
      pageIdentifier: payload.pageId,
      parentId: payload.parentId ?? null,
      bodyHtml: plainTextToHtml(body),
      viewer: config.viewer,
    });

    const responsePayload: CreateCommentResult = {
      ok: true,
      moderationState:
        createdComment.status === "pending" ? "pending" : "published",
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    logRouteError("POST", error, {
      hasConsoleKey: Boolean(getHyvorServerConfig().consoleApiKey),
    });
    return buildRouteErrorResponse(error, "Failed to publish the comment.");
  }
}
