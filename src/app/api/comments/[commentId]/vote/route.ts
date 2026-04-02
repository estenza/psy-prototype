import { NextRequest, NextResponse } from "next/server";
import { buildCommentsCapabilities, getHyvorServerConfig } from "@/features/comments/lib/hyvor-config";
import { voteHyvorComment } from "@/features/comments/lib/hyvor-api";

type VotePayload = {
  type: "up" | "down" | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const payload = (await request.json()) as VotePayload;
  const capabilities = buildCommentsCapabilities(getHyvorServerConfig());

  if (!capabilities.canVote) {
    return NextResponse.json(
      {
        error:
          "Vote actions are intentionally disabled in the custom UI until Hyvor SSO-backed user attribution is available.",
      },
      {
        status: 501,
      },
    );
  }

  try {
    await voteHyvorComment(Number(commentId), payload.type ?? null);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to vote on comment.",
      },
      {
        status: 502,
      },
    );
  }
}
