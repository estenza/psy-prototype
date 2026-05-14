import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { findUserById } from "@/features/auth/lib/auth-repository";
import {
  buildProfilePathFromNickname,
  getUserHandle,
} from "@/features/auth/lib/profile";
import { getAuthorFollowSummary } from "@/features/social/lib/follows-repository";

export const runtime = "nodejs";

type ProfileCardRouteProps = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: ProfileCardRouteProps,
) {
  const { userId } = await params;
  const trimmedUserId = userId.trim();

  if (!trimmedUserId) {
    return NextResponse.json({ error: "Пользователь не найден." }, { status: 400 });
  }

  const [currentUser, profileUser] = await Promise.all([
    getCurrentUser(),
    findUserById(trimmedUserId),
  ]);

  if (!profileUser) {
    return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
  }

  const follow = await getAuthorFollowSummary(
    profileUser.id,
    currentUser?.id ?? null,
  );

  return NextResponse.json({
    follow,
    ok: true,
    user: {
      avatarUrl: profileUser.avatarUrl,
      handle: getUserHandle(profileUser),
      id: profileUser.id,
      name: profileUser.displayName,
      profileDescription: profileUser.profileDescription,
      profilePath: buildProfilePathFromNickname(profileUser.nickname),
      role: profileUser.role,
      specialistStatus: profileUser.specialistStatus,
      specialties: profileUser.specialties,
      updatedAt: profileUser.updatedAt,
    },
    viewerIsOwner: currentUser?.id === profileUser.id,
  });
}
