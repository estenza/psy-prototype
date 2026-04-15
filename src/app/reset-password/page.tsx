import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { PasswordResetConfirmForm } from "@/features/auth/components/password-reset-confirm-form";
import { isPasswordResetTokenValid } from "@/features/auth/lib/auth-service";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token?.trim() || "";
  const tokenValid = await isPasswordResetTokenValid(token);

  return (
    <AuthPageShell homeHref={adminConsoleRequest ? "/sign-in" : "/"} showAdminLabel={adminConsoleRequest}>
      <PasswordResetConfirmForm
        token={token}
        tokenValid={tokenValid}
      />
    </AuthPageShell>
  );
}
