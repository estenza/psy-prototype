import { NextResponse } from "next/server";
import { FollowRepositoryError } from "@/features/social/lib/follows-repository";

export function buildFollowErrorResponse(error: unknown) {
  if (error instanceof FollowRepositoryError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/follows]", error);

  return NextResponse.json(
    {
      error: "Не удалось обновить подписку.",
    },
    {
      status: 500,
    },
  );
}
