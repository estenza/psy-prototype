import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { getCurrentUser } from "@/features/auth/lib/current-user";

export default async function BookmarksPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in?next=%2Fbookmarks");
  }

  return (
    <AccountSectionShell
      title="Закладки"
      description="Здесь будет собираться ваша личная подборка сохранённых обсуждений."
    >
      <section className="surface-elevated border-separator rounded-[28px] border p-6">
        <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
          Раздел уже подготовлен под отдельную страницу
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-[var(--label-secondary)]">
          Следующим шагом сюда можно будет вывести список действительно сохранённых публикаций. Пока закладки остаются частью текущего прототипа ленты.
        </p>

        <div className="mt-5">
          <Link
            href="/"
            className="interactive-secondary inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            Вернуться к обсуждениям
          </Link>
        </div>
      </section>
    </AccountSectionShell>
  );
}
