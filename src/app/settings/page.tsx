import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { ThemePreferenceCard } from "@/components/theme/theme-preference-card";
import { ROLE_LABELS } from "@/features/auth/constants";
import { getCurrentUser } from "@/features/auth/lib/current-user";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in?next=%2Fsettings");
  }

  return (
    <AccountSectionShell
      title="Настройки"
      description="Управление оформлением и базовыми параметрами текущего аккаунта."
    >
      <ThemePreferenceCard />

      <section className="surface-elevated border-separator rounded-[28px] border p-6">
        <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
          Аккаунт
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-[var(--fill-quaternary)] px-4 py-3">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
              Email
            </div>
            <div className="mt-1 text-[15px] font-medium text-[var(--label-primary)]">
              {currentUser.email}
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--fill-quaternary)] px-4 py-3">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
              Роль
            </div>
            <div className="mt-1 text-[15px] font-medium text-[var(--label-primary)]">
              {ROLE_LABELS[currentUser.role]}
            </div>
          </div>
        </div>
      </section>
    </AccountSectionShell>
  );
}
