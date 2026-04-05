import { NextResponse } from "next/server";
import { clearAdminAccessKeyCookie } from "@/features/admin/lib/admin-console";
import { deleteSessionByToken } from "@/features/auth/lib/auth-service";
import { clearSessionCookie, readSessionTokenFromCookies } from "@/features/auth/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const sessionToken = await readSessionTokenFromCookies();

  if (sessionToken) {
    await deleteSessionByToken(sessionToken);
  }

  const response = NextResponse.json({
    ok: true,
  });

  clearAdminAccessKeyCookie(response);
  clearSessionCookie(response);

  return response;
}
