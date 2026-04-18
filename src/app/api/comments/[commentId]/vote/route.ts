import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { CommentsServiceError, voteComment } from "@/features/comments/lib/comments-service";

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

    console.error("[api/comments/vote]", error);

    return NextResponse.json(
      {
        error: "Не удалось поставить лайк.",
      },
      {
        status: 500,
      },
    );
  }
}
