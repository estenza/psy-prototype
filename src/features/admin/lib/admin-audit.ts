import "server-only";

type AdminAccessLogResult = "success" | "forbidden";

type LogAdminAccessAttemptInput = {
  email?: string | null;
  host?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  result: AdminAccessLogResult;
};

export function logAdminAccessAttempt({
  email,
  host,
  ip,
  userAgent,
  result,
}: LogAdminAccessAttemptInput) {
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedHost = host?.trim().toLowerCase() || null;
  const normalizedIp = ip?.trim() || null;
  const normalizedUserAgent = userAgent?.trim() || null;

  console.info("[admin-access]", {
    timestamp: new Date().toISOString(),
    email: normalizedEmail,
    host: normalizedHost,
    ip: normalizedIp,
    userAgent: normalizedUserAgent,
    result,
  });
}
