import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { reportComment } from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";

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
    return buildCommentsErrorResponse(
      error,
      "Не удалось отправить жалобу на комментарий.",
      "api/comments/report",
    );
  }
}
