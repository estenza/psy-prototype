import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import {
  deletePost,
  findPostById,
  updatePost,
} from "@/features/feed/lib/posts-repository";
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
    const post = await findPostById(postId, currentUser);

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
    const post = await updatePost(postId, {
      author: currentUser,
      content: payload.content,
      intent: payload.intent,
      title: payload.title,
      topic: payload.topic,
    });

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
    await deletePost(postId, currentUser);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}
