import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { CommentsServiceError, reportComment } from "@/features/comments/lib/comments-service";

export const runtime = "nodejs";

type ReportPayload = {
  reason?: string | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const payload = (await request.json()) as ReportPayload;

    await reportComment({
      commentId,
      currentUser: await getCurrentUser(),
      reason: payload.reason ?? null,
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

    console.error("[api/comments/report]", error);

    return NextResponse.json(
      {
        error: "Не удалось отправить жалобу на комментарий.",
      },
      {
        status: 500,
      },
    );
  }
}
