import { NextRequest, NextResponse } from "next/server";
import { requireModeratorUser } from "@/features/admin/lib/admin-access";
import { buildReportsErrorResponse } from "@/features/reports/lib/reports-http";
import { applyAdminReportAction } from "@/features/reports/lib/reports-service";
import type { AdminReportAction } from "@/features/reports/types";

export const runtime = "nodejs";

type AdminReportActionPayload = {
  action?: AdminReportAction | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const currentUser = await requireModeratorUser();
    const { reportId } = await context.params;
    const payload = (await request.json()) as AdminReportActionPayload;

    if (!payload.action) {
      return NextResponse.json(
        {
          error: "Укажите действие.",
        },
        {
          status: 400,
        },
      );
    }

    await applyAdminReportAction({
      action: payload.action,
      actor: currentUser,
      reportId,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildReportsErrorResponse(
      error,
      "Не удалось применить действие по жалобе.",
      "api/admin/reports/[reportId]",
    );
  }
}
