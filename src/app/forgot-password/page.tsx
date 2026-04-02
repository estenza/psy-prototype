import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { PasswordResetRequestForm } from "@/features/auth/components/password-reset-request-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AuthPageShell>
      <PasswordResetRequestForm initialEmail={resolvedSearchParams.email?.trim() || ""} />
    </AuthPageShell>
  );
}
