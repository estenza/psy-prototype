import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { AdminSpecialtyTags } from "@/features/admin/components/admin-specialty-tags";
import { AdminUserEditorLauncher } from "@/features/admin/components/admin-user-editor-launcher";
import { AdminUserRowActions } from "@/features/admin/components/admin-user-row-actions";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getAdminUsers, normalizeAdminUsersFilters } from "@/features/admin/lib/admin-service";
import { getUserHandle } from "@/features/auth/lib/profile";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getAccountTypeLabel(user: {
  isModerator: boolean;
  role: "specialist" | "user";
}) {
  if (user.isModerator) {
    return "Модератор";
  }

  return user.role === "specialist" ? "Специалист" : "Пользователь";
}

function getStatusCopy(user: {
  banReason: string | null;
  isBanned: boolean;
  specialistStatus: string;
}) {
  if (user.isBanned) {
    return {
      label: "Забанен",
      note: user.banReason ?? "Без причины",
      tone: "bg-[rgba(239,68,68,0.14)] text-[var(--accent-critical)]",
    };
  }

  return {
    label: "Активен",
    note:
      user.specialistStatus !== "none"
        ? `Статус специалиста: ${user.specialistStatus}`
        : null,
    tone: "bg-[rgba(34,197,94,0.14)] text-[var(--accent-success)]",
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    specialistStatus?: string;
    role?: string;
  }>;
}) {
  const currentUser = await requireModeratorPageAccess();
  const resolvedSearchParams = await searchParams;
  const filters = normalizeAdminUsersFilters({
    specialistStatus: resolvedSearchParams.specialistStatus,
    role: resolvedSearchParams.role,
  });
  const users = await getAdminUsers(filters);

  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader showCreateAction={false} />

      <main className="mx-auto max-w-[1400px] px-4 pb-10 min-[721px]:pt-[calc(var(--app-header-height)+28px)] sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
              Admin
            </p>
            <h1 className="font-helvetica mt-2 text-[32px] font-bold leading-none">
              Users
            </h1>
            <p className="mt-3 text-sm text-[var(--label-secondary)]">
              Текущий moderator: {getUserHandle(currentUser)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canAccessAdminConsole(currentUser) ? <AdminUserEditorLauncher /> : null}
            <Link
              href="/"
              className="interactive-fill inline-flex rounded-full px-4 py-2 text-sm font-semibold"
            >
              На главную
            </Link>
          </div>
        </div>

        <form
          method="get"
          className="border-separator mb-6 flex flex-wrap items-end gap-3 rounded-[24px] border p-4"
        >
          <label className="flex min-w-[180px] flex-col gap-2 text-sm">
            <span className="font-medium">Тип аккаунта</span>
            <select
              name="role"
              defaultValue={filters.role}
              className="border-separator bg-background-primary rounded-xl border px-3 py-2"
            >
              <option value="all">все аккаунты</option>
              <option value="moderator">только модераторы</option>
              <option value="specialist">только специалисты</option>
            </select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-2 text-sm">
            <span className="font-medium">Статус специалиста</span>
            <select
              name="specialistStatus"
              defaultValue={filters.specialistStatus}
              className="border-separator bg-background-primary rounded-xl border px-3 py-2"
            >
              <option value="all">все статусы</option>
              <option value="none">без статуса</option>
              <option value="pending">на проверке</option>
              <option value="verified">подтвержден</option>
              <option value="rejected">отклонен</option>
              <option value="suspended">приостановлен</option>
            </select>
          </label>

          <button
            type="submit"
            className="interactive-fill rounded-full px-4 py-2 text-sm font-semibold"
          >
            Применить
          </button>

          <Link
            href="/admin/users"
            className="interactive-control rounded-full px-4 py-2 text-sm font-semibold"
          >
            Сбросить
          </Link>
        </form>

        <div className="border-separator overflow-hidden rounded-[24px] border">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-background-primary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Аккаунт</th>
                  <th className="px-4 py-3 font-semibold">Тип</th>
                  <th className="px-4 py-3 font-semibold">Направления</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 font-semibold">Создан</th>
                  <th className="px-4 py-3 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const statusCopy = getStatusCopy(user);

                  return (
                    <tr
                      key={user.id}
                      className="border-separator border-t align-top"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-[260px] items-start gap-3">
                          <UserAvatar
                            avatarUrl={user.avatarUrl}
                            name={user.displayName}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--label-primary)]">
                              {user.displayName}
                            </div>
                            <div className="mt-1 text-[13px] text-[var(--label-secondary)]">
                              {user.email}
                            </div>
                            <div className="mt-1 text-[13px] text-[var(--label-tertiary)]">
                              {user.nickname ? `@${user.nickname}` : "Без хэндла"}
                            </div>
                            {user.profileDescription ? (
                              <p className="mt-2 line-clamp-2 max-w-[440px] text-[13px] leading-5 text-[var(--label-secondary)]">
                                {user.profileDescription}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[var(--label-primary)]">
                          {getAccountTypeLabel(user)}
                        </div>
                        {user.role === "specialist" && user.firstName && user.lastName ? (
                          <div className="mt-1 text-[13px] text-[var(--label-secondary)]">
                            {user.firstName} {user.lastName}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {user.role === "specialist" ? (
                          <AdminSpecialtyTags specialties={user.specialties} />
                        ) : (
                          <span className="text-[13px] text-[var(--label-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${statusCopy.tone}`.trim()}
                          >
                            {statusCopy.label}
                          </span>
                          {statusCopy.note ? (
                            <p className="max-w-[220px] text-[13px] leading-5 text-[var(--label-secondary)]">
                              {statusCopy.note}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[var(--label-secondary)]">
                        {dateFormatter.format(new Date(user.createdAt))}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end">
                          <AdminUserRowActions user={user} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 ? (
            <div className="px-4 py-8 text-sm text-[var(--label-secondary)]">
              По текущим фильтрам пользователей нет.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
