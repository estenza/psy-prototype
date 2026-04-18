import { NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import { CommentsServiceError, getAdminCommentReports } from "@/features/comments/lib/comments-service";
import type { AdminCommentReportsResponse } from "@/features/comments/types";

export const runtime = "nodejs";

function buildAdminCommentsErrorResponse(error: unknown) {
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

  console.error("[api/admin/comments/reports]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка модерации комментариев.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    await requireModeratorUser();

    return NextResponse.json<AdminCommentReportsResponse>({
      reports: await getAdminCommentReports(),
    });
  } catch (error) {
    return buildAdminCommentsErrorResponse(error);
  }
}
