import { NextResponse } from "next/server";
import { CommentsServiceError } from "@/features/comments/lib/comments-service";

function hasHttpStatus(error: unknown): error is { message: string; status: number } {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    "status" in error &&
    typeof error.status === "number"
  );
}

export function buildCommentsErrorResponse(
  error: unknown,
  fallbackMessage: string,
  scope = "api/comments",
) {
  if (error instanceof CommentsServiceError || hasHttpStatus(error)) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(`[${scope}]`, error);

  return NextResponse.json(
    {
      error: fallbackMessage,
    },
    {
      status: 500,
    },
  );
}
