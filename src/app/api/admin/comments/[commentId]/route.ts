import { NextRequest, NextResponse } from "next/server";
import { requireModeratorUser } from "@/features/admin/lib/admin-access";
import { moderateComment } from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";
import type { AdminModerateCommentPayload } from "@/features/comments/types";

export const runtime = "nodejs";

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
    return buildCommentsErrorResponse(
      error,
      "Не удалось применить действие модерации.",
      "api/admin/comments/[commentId]",
    );
  }
}
