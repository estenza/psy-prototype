import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AdminUserRowActions } from "@/features/admin/components/admin-user-row-actions";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getAdminUsers, normalizeAdminUsersFilters } from "@/features/admin/lib/admin-service";
import { getUserHandle } from "@/features/auth/lib/profile";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
  const users = getAdminUsers(filters);

  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader showCreateAction={false} />

      <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-[calc(var(--app-header-height)+28px)] sm:px-6">
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

          <Link
            href="/"
            className="interactive-fill inline-flex rounded-full px-4 py-2 text-sm font-semibold"
          >
            На главную
          </Link>
        </div>

        <form
          method="get"
          className="border-separator mb-6 flex flex-wrap items-end gap-3 rounded-[24px] border p-4"
        >
          <label className="flex min-w-[180px] flex-col gap-2 text-sm">
            <span className="font-medium">Role</span>
            <select
              name="role"
              defaultValue={filters.role}
              className="border-separator bg-background-primary rounded-xl border px-3 py-2"
            >
              <option value="all">all users</option>
              <option value="moderator">only moderators</option>
              <option value="specialist">only specialists</option>
            </select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-2 text-sm">
            <span className="font-medium">Specialist status</span>
            <select
              name="specialistStatus"
              defaultValue={filters.specialistStatus}
              className="border-separator bg-background-primary rounded-xl border px-3 py-2"
            >
              <option value="all">all statuses</option>
              <option value="none">none</option>
              <option value="pending">pending</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
              <option value="suspended">suspended</option>
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
              <thead className="bg-[color-mix(in_srgb,var(--label-primary)_4%,white)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">displayName</th>
                  <th className="px-4 py-3 font-semibold">handle</th>
                  <th className="px-4 py-3 font-semibold">email</th>
                  <th className="px-4 py-3 font-semibold">role</th>
                  <th className="px-4 py-3 font-semibold">specialistStatus</th>
                  <th className="px-4 py-3 font-semibold">createdAt</th>
                  <th className="px-4 py-3 font-semibold">actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-separator border-t align-top"
                  >
                    <td className="px-4 py-4 font-medium">{user.displayName}</td>
                    <td className="px-4 py-4 text-[var(--label-secondary)]">
                      {user.nickname ? `@${user.nickname}` : "—"}
                    </td>
                    <td className="px-4 py-4 text-[var(--label-secondary)]">{user.email}</td>
                    <td className="px-4 py-4">
                      {user.role}
                      {user.isModerator ? " · moderator" : ""}
                    </td>
                    <td className="px-4 py-4">{user.specialistStatus}</td>
                    <td className="px-4 py-4 text-[var(--label-secondary)]">
                      {dateFormatter.format(new Date(user.createdAt))}
                    </td>
                    <td className="px-4 py-4">
                      <AdminUserRowActions user={user} />
                    </td>
                  </tr>
                ))}
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
