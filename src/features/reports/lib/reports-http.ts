import { NextResponse } from "next/server";
import { AdminAccessError } from "@/features/admin/lib/admin-access";
import { ReportsRepositoryError } from "@/features/reports/lib/reports-repository";
import { ReportsServiceError } from "@/features/reports/lib/reports-service";

export function buildReportsErrorResponse(
  error: unknown,
  fallbackMessage: string,
  logContext = "api/reports",
) {
  if (
    error instanceof ReportsServiceError
    || error instanceof ReportsRepositoryError
    || error instanceof AdminAccessError
  ) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(`[${logContext}]`, error);

  return NextResponse.json(
    {
      error: fallbackMessage,
    },
    {
      status: 500,
    },
  );
}
