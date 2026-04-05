import { redirect } from "next/navigation";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
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
  const nextPath =
    resolvedSearchParams.next?.trim() || (adminConsoleRequest ? "/admin/users" : "/");

  if (currentUser) {
    if (adminConsoleRequest && !canAccessAdminConsole(currentUser)) {
      return (
        <AuthPageShell homeHref="/sign-in">
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

  return (
    <AuthPageShell homeHref={adminConsoleRequest ? "/sign-in" : "/"}>
      <AuthForm
        mode="sign-in"
        context={adminConsoleRequest ? "admin" : "default"}
        defaultNextPath={nextPath}
      />
    </AuthPageShell>
  );
}
