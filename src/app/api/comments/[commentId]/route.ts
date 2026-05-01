import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  editComment,
  removeComment,
} from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";
import type { UpdateCommentPayload } from "@/features/comments/types";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const payload = (await request.json()) as UpdateCommentPayload;

    await editComment({
      body: payload.body,
      commentId,
      currentUser: await getCurrentUser(),
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildCommentsErrorResponse(
      error,
      "Не удалось обновить комментарий.",
      "api/comments/[commentId]",
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;

    await removeComment({
      commentId,
      currentUser: await getCurrentUser(),
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildCommentsErrorResponse(
      error,
      "Не удалось удалить комментарий.",
      "api/comments/[commentId]",
    );
  }
}
