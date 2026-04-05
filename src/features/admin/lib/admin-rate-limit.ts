import "server-only";

type RateLimitBucket = "admin-sign-in" | "admin-access" | "admin-gate";

type RateLimitState = {
  count: number;
  expiresAt: number;
};

const rateLimitState = new Map<string, RateLimitState>();

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRateLimitStorageKey(bucket: RateLimitBucket, key: string) {
  return `${bucket}:${key}`;
}

function getWindowMs() {
  return toNumber(process.env.ADMIN_RATE_LIMIT_WINDOW_MS, 60_000);
}

function getBucketLimit(bucket: RateLimitBucket) {
  if (bucket === "admin-sign-in" || bucket === "admin-gate") {
    return toNumber(process.env.ADMIN_SIGN_IN_RATE_LIMIT_MAX, 10);
  }

  return toNumber(process.env.ADMIN_ACCESS_RATE_LIMIT_MAX, 30);
}

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of rateLimitState.entries()) {
    if (value.expiresAt <= now) {
      rateLimitState.delete(key);
    }
  }
}

export function consumeAdminRateLimit(bucket: RateLimitBucket, key: string) {
  const now = Date.now();

  if (rateLimitState.size > 2_000) {
    cleanupExpiredEntries(now);
  }

  const storageKey = buildRateLimitStorageKey(bucket, key);
  const windowMs = getWindowMs();
  const limit = getBucketLimit(bucket);
  const existingState = rateLimitState.get(storageKey);

  if (!existingState || existingState.expiresAt <= now) {
    rateLimitState.set(storageKey, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existingState.count += 1;
  rateLimitState.set(storageKey, existingState);

  return {
    allowed: existingState.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((existingState.expiresAt - now) / 1000)),
  };
}

export function buildAdminRateLimitKey({
  ip,
  email,
}: {
  ip?: string | null;
  email?: string | null;
}) {
  const normalizedIp = ip?.trim().toLowerCase() || "unknown-ip";
  const normalizedEmail = email?.trim().toLowerCase() || "unknown-email";

  return `${normalizedIp}:${normalizedEmail}`;
}
