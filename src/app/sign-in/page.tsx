import { redirect } from "next/navigation";
import { AdminOtpSignIn } from "@/features/admin/components/admin-otp-sign-in";
import { canAccessAdminConsole, normalizeAdminNextPath } from "@/features/admin/lib/admin-console";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
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
  const resolvedSearchParams = await searchParams;
  const nextPath = adminConsoleRequest
    ? normalizeAdminNextPath(resolvedSearchParams.next)
    : resolvedSearchParams.next?.trim() || "/";

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
    <AuthPageShell homeHref="/">
      <AuthForm
        mode="sign-in"
        context="default"
        defaultNextPath={nextPath}
      />
    </AuthPageShell>
  );
}
