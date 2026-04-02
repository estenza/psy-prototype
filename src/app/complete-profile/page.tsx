import Link from "next/link";
import { redirect } from "next/navigation";
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
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next?.trim() || "/";

  if (!currentUser) {
    redirect(`/sign-in?next=${encodeURIComponent(`/complete-profile?next=${nextPath}`)}`);
  }

  if (resolveOnboardingStep(currentUser) === "complete") {
    redirect(buildPostAuthRedirectPath(currentUser, nextPath));
  }

  return (
    <main className="surface-primary flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="app-brand font-helvetica text-[32px] font-black leading-none"
        >
          внутри.
        </Link>
      </div>
      <AuthOnboarding currentUser={currentUser} nextPath={nextPath} />
    </main>
  );
}
