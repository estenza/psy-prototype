import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { togglePostBookmark } from "@/features/feed/lib/post-actions-service";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import type { PostMutationResponse } from "@/features/feed/types";

export const runtime = "nodejs";

type PostBookmarkPayload = {
  bookmarked: boolean;
};

type PostBookmarkRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: PostBookmarkRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы добавлять посты в закладки.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    const payload = (await request.json()) as PostBookmarkPayload;
    const post = await togglePostBookmark({
      actor: currentUser,
      bookmarked: Boolean(payload.bookmarked),
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
