import { NextResponse } from "next/server";
import { AuthServiceError } from "@/features/auth/lib/auth-service";

export function buildAuthErrorResponse(error: unknown) {
  if (error instanceof AuthServiceError) {
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

  console.error("[api/auth]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка авторизации.",
    },
    {
      status: 500,
    },
  );
}
