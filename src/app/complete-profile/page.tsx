import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBrand } from "@/components/layout/app-brand";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
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
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath =
    resolvedSearchParams.next?.trim() || (adminConsoleRequest ? "/admin/users" : "/");

  if (!currentUser) {
    redirect(`/sign-in?next=${encodeURIComponent(`/complete-profile?next=${nextPath}`)}`);
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
    <main className="surface-primary flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link
          href={adminConsoleRequest ? "/admin/users" : "/"}
          aria-label="внутри"
          className="inline-flex max-w-full"
        >
          <AppBrand showAdminLabel={adminConsoleRequest} />
        </Link>
      </div>
      <AuthOnboarding currentUser={currentUser} nextPath={nextPath} />
    </main>
  );
}
