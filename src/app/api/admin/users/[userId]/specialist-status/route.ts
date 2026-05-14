import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import {
  AdminServiceError,
  updateAdminSpecialistStatus,
} from "@/features/admin/lib/admin-service";
import type { AdminManagedUserResponse } from "@/features/admin/types";

export const runtime = "nodejs";

function buildAdminSpecialistStatusErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError || error instanceof AdminServiceError) {
    const fieldErrors = error instanceof AdminServiceError
      ? error.fieldErrors
      : undefined;

    return NextResponse.json(
      {
        error: error.message,
        fieldErrors,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/admin/users/:userId/specialist-status]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка админ-зоны.",
    },
    {
      status: 500,
    },
  );
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      userId: string;
    }>;
  },
) {
  try {
    const currentUser = await requireModeratorUser();
    const { userId } = await context.params;
    const payload = (await request.json()) as {
      specialistStatus?: string | null;
    };
    const updatedUser = await updateAdminSpecialistStatus(currentUser, userId, payload);

    return NextResponse.json<AdminManagedUserResponse>({
      ok: true,
      user: updatedUser,
    });
  } catch (error) {
    return buildAdminSpecialistStatusErrorResponse(error);
  }
}
