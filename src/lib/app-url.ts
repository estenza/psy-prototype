import "server-only";

const DEFAULT_PRODUCTION_APP_URL = "https://vnutri.live";
const DEFAULT_DEVELOPMENT_APP_URL = "http://localhost:3000";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildPublicAppUrl(origin?: string) {
  const explicitAppUrl = process.env.AUTH_APP_URL?.trim();

  if (explicitAppUrl) {
    return trimTrailingSlash(explicitAppUrl);
  }

  if (origin?.trim()) {
    return trimTrailingSlash(origin.trim());
  }

  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_APP_URL
    : DEFAULT_DEVELOPMENT_APP_URL;
}

export function buildAbsoluteAppUrl(path: string, origin?: string) {
  return new URL(path, buildPublicAppUrl(origin)).toString();
}
