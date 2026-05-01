import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { voteComment } from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";

export const runtime = "nodejs";

type VotePayload = {
  type: "up" | "down" | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const payload = (await request.json()) as VotePayload;

    await voteComment({
      commentId,
      currentUser: await getCurrentUser(),
      type: payload.type ?? null,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildCommentsErrorResponse(error, "Не удалось поставить лайк.", "api/comments/vote");
  }
}
