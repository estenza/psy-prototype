import { NextRequest, NextResponse } from "next/server";
import { getAppEnvironment } from "@/lib/app-env";
import { processNotificationEvents } from "@/features/notifications/lib/notification-events";

export const runtime = "nodejs";

function getWorkerSecret() {
  return process.env.DOMAIN_EVENTS_WORKER_SECRET?.trim()
    || process.env.CRON_SECRET?.trim()
    || "";
}

function isAuthorized(request: NextRequest) {
  const secret = getWorkerSecret();

  if (!secret) {
    const appEnvironment = getAppEnvironment();
    return appEnvironment === "development" || process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const headerSecret = request.headers.get("x-domain-events-secret")?.trim() ?? "";

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Недостаточно прав для обработки событий." },
      { status: 403 },
    );
  }

  const requestUrl = new URL(request.url);
  const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "20", 10);
  const result = await processNotificationEvents(Number.isFinite(limit) ? limit : 20);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
