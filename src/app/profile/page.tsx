import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { ROLE_LABELS, SPECIALIST_STATUS_LABELS } from "@/features/auth/constants";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getUserHandle, resolveOnboardingStep } from "@/features/auth/lib/profile";

const ONBOARDING_STEP_LABELS = {
  complete: "Профиль заполнен",
  role: "Нужно выбрать роль",
  "specialist-profile": "Нужно заполнить профиль специалиста",
  "user-profile": "Нужно заполнить пользовательский профиль",
} as const;

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-[var(--fill-quaternary)] px-4 py-3">
      <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-medium text-[var(--label-primary)]">
        {value}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in?next=%2Fprofile");
  }

  const currentStep = resolveOnboardingStep(currentUser);

  return (
    <AccountSectionShell
      title="Мой профиль"
      description="Основные данные аккаунта и текущий статус оформления профиля."
    >
      <section className="surface-elevated border-separator rounded-[28px] border p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar
            avatarUrl={currentUser.avatarUrl}
            name={currentUser.displayName}
            size="lg"
          />

          <div className="min-w-0">
            <h2 className="truncate text-[24px] font-semibold text-[var(--label-primary)]">
              {currentUser.displayName}
            </h2>
            <p className="mt-1 text-[14px] text-[var(--label-secondary)]">
              {currentUser.nickname ? getUserHandle(currentUser) : "Псевдоним пока не выбран"}
            </p>
            <p className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">
              {currentUser.email}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ProfileField label="Роль" value={ROLE_LABELS[currentUser.role]} />
          <ProfileField label="Статус" value={ONBOARDING_STEP_LABELS[currentStep]} />
          <ProfileField
            label="Никнейм"
            value={currentUser.nickname ? `@${currentUser.nickname}` : "Пока не указан"}
          />
          <ProfileField
            label="Модерация"
            value={currentUser.isModerator ? "Есть права модератора" : "Обычный доступ"}
          />
          {currentUser.role === "specialist" ? (
            <ProfileField
              label="Статус специалиста"
              value={SPECIALIST_STATUS_LABELS[currentUser.specialistStatus]}
            />
          ) : null}
        </div>
      </section>

      {currentStep !== "complete" ? (
        <section className="surface-elevated border-separator rounded-[28px] border p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
            Профиль ещё не завершён
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--label-secondary)]">
            Чтобы профиль выглядел законченным, осталось пройти следующий шаг онбординга.
          </p>
          <div className="mt-5">
            <Link
              href="/complete-profile?next=%2Fprofile"
              className="interactive-secondary inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              Продолжить оформление
            </Link>
          </div>
        </section>
      ) : null}
    </AccountSectionShell>
  );
}
