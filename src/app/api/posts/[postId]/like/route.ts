import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { setPostLike } from "@/features/feed/lib/posts-repository";
import type { PostMutationResponse } from "@/features/feed/types";

export const runtime = "nodejs";

type PostLikePayload = {
  liked: boolean;
};

type PostLikeRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: PostLikeRouteProps,
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
    const payload = (await request.json()) as PostLikePayload;
    const post = await setPostLike({
      actor: currentUser,
      liked: Boolean(payload.liked),
      postId,
    });

    return NextResponse.json<PostMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}
