import { redirect } from "next/navigation";
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
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next?.trim() || "/";

  if (currentUser) {
    redirect(buildPostAuthRedirectPath(currentUser, nextPath));
  }

  return (
    <AuthPageShell>
      <AuthForm mode="sign-in" />
    </AuthPageShell>
  );
}
