import { NextRequest, NextResponse } from "next/server";
import { requireModeratorUser, AdminAccessError } from "@/features/admin/lib/admin-access";
import { getAdminUsers, normalizeAdminUsersFilters } from "@/features/admin/lib/admin-service";
import type { AdminUsersResponse } from "@/features/admin/types";

export const runtime = "nodejs";

function buildAdminAccessResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/admin/users]", error);

  return NextResponse.json(
    {
      error: "Внутренняя ошибка админ-зоны.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireModeratorUser();

    const filters = normalizeAdminUsersFilters({
      specialistStatus: request.nextUrl.searchParams.get("specialistStatus"),
      role: request.nextUrl.searchParams.get("role"),
    });

    return NextResponse.json<AdminUsersResponse>({
      filters,
      users: await getAdminUsers(filters),
    });
  } catch (error) {
    return buildAdminAccessResponse(error);
  }
}
