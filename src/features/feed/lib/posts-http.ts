import { NextResponse } from "next/server";
import { PostRepositoryError } from "@/features/feed/lib/posts-repository";

export function buildPostErrorResponse(error: unknown) {
  if (error instanceof PostRepositoryError) {
    return NextResponse.json(
      {
        error: error.message,
        fieldErrors: error.fieldErrors,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/posts]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка при работе с постами.",
    },
    {
      status: 500,
    },
  );
}
