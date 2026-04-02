import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import { AdminServiceError, updateAdminUser } from "@/features/admin/lib/admin-service";
import type { AdminUpdateUserPayload } from "@/features/admin/types";

export const runtime = "nodejs";

function buildAdminMutationErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError || error instanceof AdminServiceError) {
    return NextResponse.json(
      {
        error: error.message,
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
    await requireModeratorUser();

    const { userId } = await context.params;
    const payload = (await request.json()) as AdminUpdateUserPayload;
    const updatedUser = updateAdminUser(userId, payload);

    return NextResponse.json({
      ok: true,
      user: updatedUser,
    });
  } catch (error) {
    return buildAdminMutationErrorResponse(error);
  }
}
