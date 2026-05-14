import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminOtpSignIn } from "@/features/admin/components/admin-otp-sign-in";
import { AuthOtpFlow } from "@/features/auth/components/auth-otp-flow";
import { canAccessAdminConsole, normalizeAdminNextPath } from "@/features/admin/lib/admin-console";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
import { AuthFlowModalPageShell } from "@/features/auth/components/auth-flow-modal-page-shell";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";

const PROTECTED_APP_NEXT_PATHS = [
  "/bookmarks",
  "/complete-profile",
  "/drafts",
  "/profile",
  "/settings",
] as const;

function isProtectedAppNextPath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0];

  return PROTECTED_APP_NEXT_PATHS.some((protectedPath) => (
    pathname === protectedPath || pathname.startsWith(`${protectedPath}/`)
  ));
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = adminConsoleRequest
    ? normalizeAdminNextPath(resolvedSearchParams.next)
    : resolvedSearchParams.next?.trim() || "/";

  if (!adminConsoleRequest && isProtectedAppNextPath(nextPath)) {
    redirect("/");
  }

  if (currentUser) {
    if (adminConsoleRequest && !canAccessAdminConsole(currentUser)) {
      return (
        <AuthPageShell homeHref="/sign-in" showAdminLabel>
          <AdminOtpSignIn redirectPath={nextPath} />
        </AuthPageShell>
      );
    }

    redirect(
      adminConsoleRequest
        ? nextPath
        : buildPostAuthRedirectPath(currentUser, nextPath),
    );
  }

  if (adminConsoleRequest) {
    return (
      <AuthPageShell homeHref="/sign-in" showAdminLabel>
        <AdminOtpSignIn redirectPath={nextPath} />
      </AuthPageShell>
    );
  }

  return (
    <AuthFlowModalPageShell nextPath={nextPath}>
      <div className="modal-surface surface-elevated relative w-full max-w-[420px] px-5 py-6 min-[480px]:px-6">
        <Link
          href={nextPath}
          aria-label="Закрыть"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--label-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </Link>
        <AuthOtpFlow nextHref={nextPath} titleAs="h1" />
      </div>
    </AuthFlowModalPageShell>
  );
}
