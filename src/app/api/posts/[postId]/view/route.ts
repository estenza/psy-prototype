import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostErrorResponse } from "@/features/feed/lib/posts-http";
import { registerPostView } from "@/features/feed/lib/post-query-service";

export const runtime = "nodejs";

type PostViewRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: PostViewRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return new NextResponse(null, { status: 204 });
    }

    const { postId } = await params;
    await registerPostView(postId, currentUser);

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return buildPostErrorResponse(error);
  }
}
