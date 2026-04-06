import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireModeratorUser } from "@/features/admin/lib/admin-access";
import { AdminServiceError, banAdminManagedUser } from "@/features/admin/lib/admin-service";
import type { AdminBanUserPayload, AdminManagedUserResponse } from "@/features/admin/types";

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

  console.error("[api/admin/users/:userId/ban]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка админ-зоны.",
    },
    {
      status: 500,
    },
  );
}

export async function POST(
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
    const payload = (await request.json()) as AdminBanUserPayload;
    const user = await banAdminManagedUser(currentUser, userId, payload);

    return NextResponse.json<AdminManagedUserResponse>({
      ok: true,
      user,
    });
  } catch (error) {
    return buildAdminMutationErrorResponse(error);
  }
}
