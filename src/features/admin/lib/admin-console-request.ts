import "server-only";

import { cookies, headers } from "next/headers";
import {
  ADMIN_ACCESS_KEY_COOKIE_NAME,
  isAdminConsoleHost,
  normalizeHost,
  resolveAdminAccessKey,
} from "@/features/admin/lib/admin-console";

export async function getRequestHeaders() {
  return headers();
}

export async function getRequestHost() {
  const requestHeaders = await getRequestHeaders();

  return normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
}

export async function getRequestIp() {
  const requestHeaders = await getRequestHeaders();
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return requestHeaders.get("x-real-ip")?.trim() || null;
}

export async function getRequestUserAgent() {
  const requestHeaders = await getRequestHeaders();

  return requestHeaders.get("user-agent");
}

export async function getAdminAccessKey() {
  const requestHeaders = await getRequestHeaders();
  const cookieStore = await cookies();

  return resolveAdminAccessKey({
    cookieValue: cookieStore.get(ADMIN_ACCESS_KEY_COOKIE_NAME)?.value ?? null,
    headerValue: requestHeaders.get("x-admin-access-key"),
  });
}

export async function isAdminConsoleRequest() {
  return isAdminConsoleHost(await getRequestHost());
}
