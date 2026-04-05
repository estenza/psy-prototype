import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { PasswordResetRequestForm } from "@/features/auth/components/password-reset-request-form";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const resolvedSearchParams = await searchParams;

  return (
    <AuthPageShell homeHref={adminConsoleRequest ? "/sign-in" : "/"}>
      <PasswordResetRequestForm initialEmail={resolvedSearchParams.email?.trim() || ""} />
    </AuthPageShell>
  );
}
