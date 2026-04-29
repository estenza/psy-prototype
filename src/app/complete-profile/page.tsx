import { redirect } from "next/navigation";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
import { AuthFlowModalPageShell } from "@/features/auth/components/auth-flow-modal-page-shell";
import { AuthOnboarding } from "@/features/auth/components/auth-onboarding";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildPostAuthRedirectPath, resolveOnboardingStep } from "@/features/auth/lib/profile";

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const currentUser = await getCurrentUser({
    completeSkippableUserOnboarding: false,
  });
  const resolvedSearchParams = await searchParams;
  const nextPath =
    resolvedSearchParams.next?.trim() || (adminConsoleRequest ? "/admin/users" : "/");

  if (!currentUser) {
    redirect(adminConsoleRequest
      ? `/sign-in?next=${encodeURIComponent(`/complete-profile?next=${nextPath}`)}`
      : "/");
  }

  if (adminConsoleRequest && !canAccessAdminConsole(currentUser)) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  if (resolveOnboardingStep(currentUser) === "complete") {
    redirect(
      adminConsoleRequest
        ? nextPath
        : buildPostAuthRedirectPath(currentUser, nextPath),
    );
  }

  return (
    <AuthFlowModalPageShell nextPath={nextPath}>
      <AuthOnboarding closeHref={nextPath} currentUser={currentUser} nextPath={nextPath} />
    </AuthFlowModalPageShell>
  );
}
