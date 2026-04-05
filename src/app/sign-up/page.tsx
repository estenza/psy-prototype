import { redirect } from "next/navigation";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next?.trim() || "/";

  if (adminConsoleRequest) {
    redirect(`/sign-in?next=${encodeURIComponent("/admin/users")}`);
  }

  if (currentUser) {
    redirect(buildPostAuthRedirectPath(currentUser, nextPath));
  }

  return (
    <AuthPageShell>
      <AuthForm
        mode="sign-up"
        defaultNextPath={nextPath}
      />
    </AuthPageShell>
  );
}
