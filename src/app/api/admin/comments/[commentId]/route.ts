import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import {
  CommentsServiceError,
  moderateComment,
} from "@/features/comments/lib/comments-service";
import type { AdminModerateCommentPayload } from "@/features/comments/types";

export const runtime = "nodejs";

function buildAdminCommentMutationErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError || error instanceof CommentsServiceError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/admin/comments/[commentId]]", error);

  return NextResponse.json(
    {
      error: "Не удалось применить действие модерации.",
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
    const currentUser = await requireModeratorUser();
    const { commentId } = await context.params;
    const payload = (await request.json()) as AdminModerateCommentPayload;

    await moderateComment({
      commentId,
      currentUser,
      payload,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildAdminCommentMutationErrorResponse(error);
  }
}
