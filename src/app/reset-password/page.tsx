import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { PasswordResetConfirmForm } from "@/features/auth/components/password-reset-confirm-form";
import { isPasswordResetTokenValid } from "@/features/auth/lib/auth-service";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token?.trim() || "";
  const tokenValid = isPasswordResetTokenValid(token);

  return (
    <AuthPageShell>
      <PasswordResetConfirmForm
        token={token}
        tokenValid={tokenValid}
      />
    </AuthPageShell>
  );
}
