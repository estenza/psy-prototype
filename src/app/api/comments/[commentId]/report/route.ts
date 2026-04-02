import { NextRequest, NextResponse } from "next/server";
import { buildCommentsCapabilities, getHyvorServerConfig } from "@/features/comments/lib/hyvor-config";
import { reportHyvorComment } from "@/features/comments/lib/hyvor-api";

type ReportPayload = {
  reason?: string | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const payload = (await request.json()) as ReportPayload;
  const capabilities = buildCommentsCapabilities(getHyvorServerConfig());

  if (!capabilities.canReport) {
    return NextResponse.json(
      {
        error:
          "Report actions are intentionally disabled in the custom UI until Hyvor SSO-backed user attribution is available.",
      },
      {
        status: 501,
      },
    );
  }

  try {
    await reportHyvorComment(Number(commentId), payload.reason ?? null);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to report the comment.",
      },
      {
        status: 502,
      },
    );
  }
}
