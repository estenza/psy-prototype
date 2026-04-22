import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const nextBinPath = resolve(repoRoot, "node_modules", "next", "dist", "bin", "next");

const port = process.env.PORT?.trim() || "3000";
const publicHost = "localhost";
const adminHost = "admin.localhost";
const localAdminEmail = process.env.LOCAL_ADMIN_EMAIL?.trim() || "admin@local.test";

const env = {
  ...process.env,
  ADMIN_APP_HOST: adminHost,
  ADMIN_ALLOWED_EMAILS: localAdminEmail,
  AUTH_INITIAL_MODERATOR_EMAILS: localAdminEmail,
  AUTH_DATABASE_PATH:
    process.env.AUTH_DATABASE_PATH?.trim()
    || resolve(repoRoot, "data", "app.db"),
};

delete env.ADMIN_APP_URL;
delete env.AUTH_DATABASE_URL;

console.log(`Local admin dev mode enabled.
Public app: http://${publicHost}:${port}
Admin app: http://${adminHost}:${port}
Local moderator email: ${localAdminEmail}

Create the account on the public host first, then sign in on the admin host.`);

const child = spawn(process.execPath, [nextBinPath, "dev", "--webpack", "-p", port], {
  cwd: repoRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
