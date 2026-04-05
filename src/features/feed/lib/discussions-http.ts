import { NextResponse } from "next/server";
import { DiscussionRepositoryError } from "@/features/feed/lib/discussions-repository";

export function buildDiscussionErrorResponse(error: unknown) {
  if (error instanceof DiscussionRepositoryError) {
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

  console.error("[api/discussions]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка при работе с обсуждениями.",
    },
    {
      status: 500,
    },
  );
}
