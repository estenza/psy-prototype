import "server-only";

import { notFound, redirect } from "next/navigation";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { logAdminAccessAttempt } from "@/features/admin/lib/admin-audit";
import { buildAdminRateLimitKey, consumeAdminRateLimit } from "@/features/admin/lib/admin-rate-limit";
import {
  getRequestHost,
  getRequestIp,
  getRequestUserAgent,
  isAdminConsoleRequest,
} from "@/features/admin/lib/admin-console-request";
import { canAccessModeratorActions } from "@/features/auth/lib/permissions";
import { getCurrentUser } from "@/features/auth/lib/current-user";

export class AdminAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

export async function requireModeratorUser() {
  const currentUser = await getCurrentUser();
  const requestHost = await getRequestHost();
  const requestIp = await getRequestIp();
  const userAgent = await getRequestUserAgent();
  const adminConsoleRequest = await isAdminConsoleRequest();

  if (!currentUser) {
    if (adminConsoleRequest) {
      const rateLimitState = consumeAdminRateLimit(
        "admin-access",
        buildAdminRateLimitKey({ ip: requestIp }),
      );
      logAdminAccessAttempt({
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });

      if (!rateLimitState.allowed) {
        throw new AdminAccessError("Access denied", 429);
      }
    }

    throw new AdminAccessError("Access denied", 401);
  }

  if (!adminConsoleRequest) {
    throw new AdminAccessError("Access denied", 404);
  }

  if (!canAccessModeratorActions(currentUser) || !canAccessAdminConsole(currentUser)) {
    const rateLimitState = consumeAdminRateLimit(
      "admin-access",
      buildAdminRateLimitKey({ ip: requestIp, email: currentUser.email }),
    );
    logAdminAccessAttempt({
      email: currentUser.email,
      host: requestHost,
      ip: requestIp,
      userAgent,
      result: "forbidden",
    });

    throw new AdminAccessError("Access denied", rateLimitState.allowed ? 403 : 429);
  }

  logAdminAccessAttempt({
    email: currentUser.email,
    host: requestHost,
    ip: requestIp,
    userAgent,
    result: "success",
  });

  return currentUser;
}

export async function requireModeratorPageAccess() {
  const currentUser = await getCurrentUser();
  const requestHost = await getRequestHost();
  const requestIp = await getRequestIp();
  const userAgent = await getRequestUserAgent();
  const adminConsoleRequest = await isAdminConsoleRequest();

  if (!currentUser) {
    if (adminConsoleRequest) {
      consumeAdminRateLimit(
        "admin-access",
        buildAdminRateLimitKey({ ip: requestIp }),
      );
      logAdminAccessAttempt({
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });
      redirect("/sign-in");
    }

    notFound();
  }

  if (!adminConsoleRequest) {
    notFound();
  }

  if (!canAccessModeratorActions(currentUser) || !canAccessAdminConsole(currentUser)) {
    const rateLimitState = consumeAdminRateLimit(
      "admin-access",
      buildAdminRateLimitKey({ ip: requestIp, email: currentUser.email }),
    );
    logAdminAccessAttempt({
      email: currentUser.email,
      host: requestHost,
      ip: requestIp,
      userAgent,
      result: "forbidden",
    });

    if (!rateLimitState.allowed) {
      notFound();
    }

    redirect("/sign-in?next=%2Fadmin%2Fusers");
  }

  logAdminAccessAttempt({
    email: currentUser.email,
    host: requestHost,
    ip: requestIp,
    userAgent,
    result: "success",
  });

  return currentUser;
}
