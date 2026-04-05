import { notFound, redirect } from "next/navigation";
import { AdminAccessGateForm } from "@/features/admin/components/admin-access-gate-form";
import { canAccessAdminConsole, getConfiguredAdminAccessKey, isValidAdminAccessKey } from "@/features/admin/lib/admin-console";
import { getAdminAccessKey, isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { getCurrentUser } from "@/features/auth/lib/current-user";

function buildRedirectPath(nextPath: string, canOpenAdmin: boolean) {
  if (canOpenAdmin) {
    return nextPath;
  }

  return `/sign-in?next=${encodeURIComponent(nextPath)}`;
}

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  if (!await isAdminConsoleRequest()) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next?.trim() || "/admin/users";
  const currentUser = await getCurrentUser();
  const canOpenAdmin = canAccessAdminConsole(currentUser);
  const redirectPath = buildRedirectPath(nextPath, canOpenAdmin);

  if (!getConfiguredAdminAccessKey()) {
    redirect(redirectPath);
  }

  if (isValidAdminAccessKey(await getAdminAccessKey())) {
    redirect(redirectPath);
  }

  return (
    <AuthPageShell homeHref="/access">
      <AdminAccessGateForm redirectPath={redirectPath} />
    </AuthPageShell>
  );
}
