import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  CommentsServiceError,
  editComment,
  removeComment,
} from "@/features/comments/lib/comments-service";
import type { UpdateCommentPayload } from "@/features/comments/types";

export const runtime = "nodejs";

function buildCommentMutationErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof CommentsServiceError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/comments/[commentId]]", error);

  return NextResponse.json(
    {
      error: fallbackMessage,
    },
    {
      status: 500,
    },
  );
}

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
    return buildCommentMutationErrorResponse(error, "Не удалось обновить комментарий.");
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
    return buildCommentMutationErrorResponse(error, "Не удалось удалить комментарий.");
  }
}
