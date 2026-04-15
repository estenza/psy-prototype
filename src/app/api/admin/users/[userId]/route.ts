import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import { AdminServiceError, deleteAdminManagedUser, updateAdminManagedUser } from "@/features/admin/lib/admin-service";
import type { AdminDeleteUserResponse, AdminManagedUserResponse, AdminUpdateManagedUserPayload } from "@/features/admin/types";

export const runtime = "nodejs";

function buildAdminMutationErrorResponse(error: unknown) {
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

  console.error("[api/admin/users/:userId]", error);

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
    const payload = (await request.json()) as AdminUpdateManagedUserPayload;
    const updatedUser = await updateAdminManagedUser(currentUser, userId, payload);

    return NextResponse.json<AdminManagedUserResponse>({
      ok: true,
      user: updatedUser,
    });
  } catch (error) {
    return buildAdminMutationErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      userId: string;
    }>;
  },
) {
  try {
    const currentUser = await requireModeratorUser();
    const { userId } = await context.params;

    await deleteAdminManagedUser(currentUser, userId);

    return NextResponse.json<AdminDeleteUserResponse>({
      ok: true,
    });
  } catch (error) {
    return buildAdminMutationErrorResponse(error);
  }
}
