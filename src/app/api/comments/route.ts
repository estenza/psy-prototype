import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  createComment,
  getCommentsSection,
} from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";
import type {
  CommentsResponsePayload,
  CommentsSortValue,
  CreateCommentPayload,
  CreateCommentResult,
} from "@/features/comments/types";

export const runtime = "nodejs";

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
    const data = await getCommentsSection({
      currentUser,
      pageId,
      sort,
    });

    return NextResponse.json<CommentsResponsePayload>({
      data,
    });
  } catch (error) {
    return buildCommentsErrorResponse(error, "Не удалось загрузить комментарии.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreateCommentPayload;

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

    const result = await createComment({
      body: payload.body,
      currentUser: await getCurrentUser(),
      pageId: payload.pageId,
      parentId: payload.parentId ?? null,
    });

    const responsePayload: CreateCommentResult = {
      ok: true,
      moderationState: result.moderationState,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    return buildCommentsErrorResponse(error, "Не удалось опубликовать комментарий.");
  }
}
