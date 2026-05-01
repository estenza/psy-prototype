import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { publishPost } from "@/features/feed/lib/post-actions-service";
import {
  DEFAULT_FEED_PAGE_SIZE,
  listFeedPosts,
} from "@/features/feed/lib/post-query-service";
import type {
  PostMutationPayload,
  PostMutationResponse,
  PostsResponsePayload,
} from "@/features/feed/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const requestUrl = new URL(request.url);
    const limit = Number.parseInt(
      requestUrl.searchParams.get("limit") ?? `${DEFAULT_FEED_PAGE_SIZE}`,
      10,
    );
    const page = await listFeedPosts(currentUser, {
      cursor: requestUrl.searchParams.get("cursor"),
      limit,
      topic: requestUrl.searchParams.get("topic"),
    });

    return NextResponse.json<PostsResponsePayload>(
      page,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы создать пост.",
        },
        {
          status: 401,
        },
      );
    }

    const payload = (await request.json()) as PostMutationPayload;
    const post = await publishPost(currentUser, payload);

    return NextResponse.json<PostMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}
