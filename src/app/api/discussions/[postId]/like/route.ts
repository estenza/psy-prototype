import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildDiscussionErrorResponse } from "@/features/feed/lib/discussions-http";
import { setDiscussionLike } from "@/features/feed/lib/discussions-repository";
import type { DiscussionMutationResponse } from "@/features/feed/types";

export const runtime = "nodejs";

type DiscussionLikePayload = {
  liked: boolean;
};

type DiscussionLikeRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: DiscussionLikeRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы ставить лайки.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    const payload = (await request.json()) as DiscussionLikePayload;
    const post = await setDiscussionLike({
      actor: currentUser,
      liked: Boolean(payload.liked),
      postId,
    });

    return NextResponse.json<DiscussionMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildDiscussionErrorResponse(error);
  }
}
