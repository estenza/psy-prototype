import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildDiscussionErrorResponse } from "@/features/feed/lib/discussions-http";
import { createDiscussion, listDiscussions } from "@/features/feed/lib/discussions-repository";
import type {
  DiscussionMutationPayload,
  DiscussionMutationResponse,
  DiscussionsResponsePayload,
} from "@/features/feed/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const posts = await listDiscussions(currentUser);

    return NextResponse.json<DiscussionsResponsePayload>(
      { posts },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return buildDiscussionErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы создать обсуждение.",
        },
        {
          status: 401,
        },
      );
    }

    const payload = (await request.json()) as DiscussionMutationPayload;
    const post = await createDiscussion({
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
