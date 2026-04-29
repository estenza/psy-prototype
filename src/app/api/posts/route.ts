import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { createPost, listPosts } from "@/features/feed/lib/posts-repository";
import type {
  PostMutationPayload,
  PostMutationResponse,
  PostsResponsePayload,
} from "@/features/feed/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const posts = await listPosts(currentUser);

    return NextResponse.json<PostsResponsePayload>(
      { posts },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы создать пост.",
        },
        {
          status: 401,
        },
      );
    }

    const payload = (await request.json()) as PostMutationPayload;
    const post = await createPost({
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
