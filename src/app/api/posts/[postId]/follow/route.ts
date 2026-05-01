import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildFollowErrorResponse } from "@/features/social/lib/follows-http";
import { togglePostFollow } from "@/features/social/lib/follow-service";

export const runtime = "nodejs";

type PostFollowPayload = {
  following?: boolean;
};

type PostFollowRouteProps = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: PostFollowRouteProps,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт, чтобы следить за постом." },
        { status: 401 },
      );
    }

    const { postId } = await params;
    const payload = (await request.json().catch(() => null)) as PostFollowPayload | null;

    await togglePostFollow({
      actor: currentUser,
      following: payload?.following !== false,
      postId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildFollowErrorResponse(error);
  }
}
