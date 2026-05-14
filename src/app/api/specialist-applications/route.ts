import { NextRequest, NextResponse } from "next/server";
import {
  AdminServiceError,
  createSpecialistApplication,
} from "@/features/admin/lib/admin-service";
import type {
  AdminManagedUserErrorResponse,
  AdminManagedUserResponse,
  AdminManagedUserPayload,
} from "@/features/admin/types";

export const runtime = "nodejs";

function buildSpecialistApplicationErrorResponse(error: unknown) {
  if (error instanceof AdminServiceError) {
    return NextResponse.json<AdminManagedUserErrorResponse>(
      {
        error: error.message,
        fieldErrors: error.fieldErrors,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/specialist-applications]", error);

  return NextResponse.json<AdminManagedUserErrorResponse>(
    {
      error: "Не удалось отправить заявку.",
    },
    {
      status: 500,
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AdminManagedUserPayload & {
      email?: string;
    };
    const user = await createSpecialistApplication(payload);

    return NextResponse.json<AdminManagedUserResponse>({
      ok: true,
      user,
    });
  } catch (error) {
    return buildSpecialistApplicationErrorResponse(error);
  }
}
