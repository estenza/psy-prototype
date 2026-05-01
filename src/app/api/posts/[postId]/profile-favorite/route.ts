import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { togglePostProfileFavorite } from "@/features/feed/lib/post-actions-service";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import type { PostMutationResponse } from "@/features/feed/types";

export const runtime = "nodejs";

type PostProfileFavoritePayload = {
  favorited: boolean;
};

type PostProfileFavoriteRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: PostProfileFavoriteRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы добавить пост в профиль.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    const payload = (await request.json()) as PostProfileFavoritePayload;
    const post = await togglePostProfileFavorite({
      actor: currentUser,
      favorited: Boolean(payload.favorited),
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
