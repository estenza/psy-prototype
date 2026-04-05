import "server-only";

const DEFAULT_BOOTSTRAP_ADMIN_EMAILS = "estenza@gmail.com";

function getBootstrapAdminEmails() {
  return new Set(
    (process.env.AUTH_INITIAL_ADMIN_EMAILS ?? DEFAULT_BOOTSTRAP_ADMIN_EMAILS)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapAdminEmail(email: string) {
  return getBootstrapAdminEmails().has(email.trim().toLowerCase());
}
