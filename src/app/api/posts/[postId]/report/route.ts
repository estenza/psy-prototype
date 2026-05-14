import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildReportsErrorResponse } from "@/features/reports/lib/reports-http";
import { submitPostReport } from "@/features/reports/lib/reports-service";
import type {
  ContentReportResponse,
  CreateContentReportPayload,
} from "@/features/reports/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await context.params;
    const payload = (await request.json()) as CreateContentReportPayload;

    await submitPostReport({
      currentUser: await getCurrentUser(),
      details: payload.details ?? null,
      postId,
      reason: payload.reason ?? null,
    });

    return NextResponse.json<ContentReportResponse>({
      ok: true,
    });
  } catch (error) {
    return buildReportsErrorResponse(
      error,
      "Не удалось отправить жалобу на пост.",
      "api/posts/[postId]/report",
    );
  }
}
