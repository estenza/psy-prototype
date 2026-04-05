import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildDiscussionErrorResponse } from "@/features/feed/lib/discussions-http";
import {
  findDiscussionById,
  updateDiscussion,
} from "@/features/feed/lib/discussions-repository";
import type {
  DiscussionMutationPayload,
  DiscussionMutationResponse,
} from "@/features/feed/types";

export const runtime = "nodejs";

type DiscussionRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: DiscussionRouteProps,
) {
  try {
    const { postId } = await params;
    const currentUser = await getCurrentUser();
    const post = await findDiscussionById(postId, currentUser);

    if (!post) {
      return NextResponse.json(
        {
          error: "Обсуждение не найдено.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json<DiscussionMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildDiscussionErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: DiscussionRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы редактировать обсуждение.",
        },
        {
          status: 401,
        },
      );
    }

    const { postId } = await params;
    const payload = (await request.json()) as DiscussionMutationPayload;
    const post = await updateDiscussion(postId, {
      author: currentUser,
      content: payload.content,
      intent: payload.intent,
      title: payload.title,
      topic: payload.topic,
    });

    return NextResponse.json<DiscussionMutationResponse>({
      ok: true,
      post,
    });
  } catch (error) {
    return buildDiscussionErrorResponse(error);
  }
}
