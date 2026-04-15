import { redirect } from "next/navigation";
import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import {
  canAccessAdminConsole,
  getConfiguredAdminAccessKey,
  isValidAdminAccessKey,
  normalizeAdminNextPath,
} from "@/features/admin/lib/admin-console";
import {
  getAdminAccessKey,
  isAdminConsoleRequest,
} from "@/features/admin/lib/admin-console-request";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const currentUser = await getCurrentUser();
  const adminAccessKey = await getAdminAccessKey();
  const resolvedSearchParams = await searchParams;
  const nextPath = adminConsoleRequest
    ? normalizeAdminNextPath(resolvedSearchParams.next)
    : resolvedSearchParams.next?.trim() || "/";

  if (currentUser) {
    if (adminConsoleRequest && !canAccessAdminConsole(currentUser)) {
      return (
        <AuthPageShell homeHref="/sign-in" showAdminLabel>
          <AuthForm
            mode="sign-in"
            context="admin"
            defaultNextPath={nextPath}
          />
        </AuthPageShell>
      );
    }

    redirect(
      adminConsoleRequest
        ? nextPath
        : buildPostAuthRedirectPath(currentUser, nextPath),
    );
  }

  if (
    adminConsoleRequest
    && getConfiguredAdminAccessKey()
    && !isValidAdminAccessKey(adminAccessKey)
  ) {
    return <AdminBrowserRedirect href={`/access?next=${encodeURIComponent(nextPath)}`} />;
  }

  return (
    <AuthPageShell homeHref={adminConsoleRequest ? "/sign-in" : "/"} showAdminLabel={adminConsoleRequest}>
      <AuthForm
        mode="sign-in"
        context={adminConsoleRequest ? "admin" : "default"}
        defaultNextPath={nextPath}
      />
    </AuthPageShell>
  );
}
