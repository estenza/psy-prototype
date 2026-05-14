import { AdminAccountsTable } from "@/features/admin/components/admin-accounts-table";
import { AdminAutoSubmitSelect } from "@/features/admin/components/admin-auto-submit-select";
import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import { AdminConsoleShell } from "@/features/admin/components/admin-console-shell";
import { AdminUserEditorLauncher } from "@/features/admin/components/admin-user-editor-launcher";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getAdminUsers, normalizeAdminUsersFilters } from "@/features/admin/lib/admin-service";
import type { AdminListedUser } from "@/features/admin/types";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getUncheckedAdminReportsCounts } from "@/features/reports/lib/reports-service";

type AdminAccountsPageProps = {
  searchParams: Promise<{
    role?: string;
    specialistStatus?: string;
  }>;
  section: "specialists" | "users";
};

function filterUsersSection(users: AdminListedUser[], role: string) {
  if (role === "moderator") {
    return users.filter((user) => user.isModerator);
  }

  if (role === "user") {
    return users.filter((user) => user.role === "user" && !user.isModerator);
  }

  return users.filter((user) => user.role === "user" || user.isModerator);
}

export async function AdminAccountsPage({
  searchParams,
  section,
}: AdminAccountsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    const nextPath = section === "users" ? "/admin/users" : "/admin/specialists";

    return (
      <AdminBrowserRedirect
        href={`/access?next=${encodeURIComponent(nextPath)}`}
      />
    );
  }

  await requireModeratorPageAccess();

  const resolvedSearchParams = await searchParams;
  const normalizedFilters = normalizeAdminUsersFilters({
    role: section === "users" ? resolvedSearchParams.role : "specialist",
    specialistStatus:
      section === "specialists" ? resolvedSearchParams.specialistStatus : "all",
  });
  const [loadedUsers, uncheckedReportsCounts] = await Promise.all([
    getAdminUsers(normalizedFilters),
    getUncheckedAdminReportsCounts(),
  ]);
  const users =
    section === "users"
      ? filterUsersSection(loadedUsers, normalizedFilters.role)
      : loadedUsers.filter((user) => user.role === "specialist");
  const selectedTabHref = section === "users" ? "/admin/users" : "/admin/specialists";

  return (
    <AdminConsoleShell
      contentClassName="min-w-[1280px]"
      currentUser={currentUser}
      selectedHref={selectedTabHref}
      uncheckedReportsCounts={uncheckedReportsCounts}
    >
      {section === "users" ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <AdminAutoSubmitSelect
              label="Тип аккаунта"
              name="role"
              value={normalizedFilters.role === "specialist" ? "all" : normalizedFilters.role}
              options={[
                { value: "all", label: "все аккаунты" },
                { value: "user", label: "только пользователи" },
                { value: "moderator", label: "только модераторы" },
              ]}
            />
          </div>

          <AdminUserEditorLauncher
            defaultRole="user"
            label="Создать"
          />
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <AdminAutoSubmitSelect
              label="Статус специалиста"
              name="specialistStatus"
              value={normalizedFilters.specialistStatus}
              options={[
                { value: "all", label: "все статусы" },
                { value: "none", label: "без статуса" },
                { value: "pending", label: "на проверке" },
                { value: "verified", label: "подтверждён" },
                { value: "rejected", label: "отклонён" },
                { value: "suspended", label: "приостановлен" },
              ]}
            />
          </div>

          <AdminUserEditorLauncher
            defaultRole="specialist"
            label="Создать"
          />
        </div>
      )}

      <AdminAccountsTable section={section} users={users} />
    </AdminConsoleShell>
  );
}
