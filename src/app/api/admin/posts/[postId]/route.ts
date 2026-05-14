import { NextRequest, NextResponse } from "next/server";
import { requireModeratorUser } from "@/features/admin/lib/admin-access";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { updatePostAsModerator } from "@/features/feed/lib/posts-repository";
import type {
  PostMutationPayload,
  PostMutationResponse,
} from "@/features/feed/types";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const currentUser = await requireModeratorUser();
    const { postId } = await context.params;
    const payload = (await request.json()) as PostMutationPayload;
    const post = await updatePostAsModerator(postId, {
      author: currentUser,
      content: payload.content,
      intent: payload.intent,
      subtopic: payload.subtopic,
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
