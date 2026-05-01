import { NextResponse } from "next/server";
import { requireModeratorUser } from "@/features/admin/lib/admin-access";
import { getAdminCommentReports } from "@/features/comments/lib/comments-service";
import { buildCommentsErrorResponse } from "@/features/comments/lib/comments-http";
import type { AdminCommentReportsResponse } from "@/features/comments/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireModeratorUser();

    return NextResponse.json<AdminCommentReportsResponse>({
      reports: await getAdminCommentReports(),
    });
  } catch (error) {
    return buildCommentsErrorResponse(
      error,
      "Внутренняя ошибка модерации комментариев.",
      "api/admin/comments/reports",
    );
  }
}
