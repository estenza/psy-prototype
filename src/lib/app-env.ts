export type AppEnvironment = "production" | "staging" | "development" | "unknown";

export function getAppEnvironment(): AppEnvironment {
  const rawValue = process.env.APP_ENV?.trim().toLowerCase();

  switch (rawValue) {
    case "production":
      return "production";
    case "staging":
      return "staging";
    case "development":
      return "development";
    default:
      return "unknown";
  }
}

export function isStagingEnvironment() {
  return getAppEnvironment() === "staging";
}
