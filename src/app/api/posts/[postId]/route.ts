import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  removePost,
  revisePost,
} from "@/features/feed/lib/post-actions-service";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { getPostForViewer } from "@/features/feed/lib/post-query-service";
import type {
  PostMutationPayload,
  PostMutationResponse,
} from "@/features/feed/types";

export const runtime = "nodejs";

type PostRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: PostRouteProps,
) {
  try {
    const { postId } = await params;
    const currentUser = await getCurrentUser();
    const post = await getPostForViewer(postId, currentUser);

    if (!post) {
      return NextResponse.json(
        {
          error: "Пост не найден.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json<PostMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: PostRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы редактировать пост.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    const payload = (await request.json()) as PostMutationPayload;
    const post = await revisePost(currentUser, postId, payload);

    return NextResponse.json<PostMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: PostRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы удалить пост.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    await removePost(currentUser, postId);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}
