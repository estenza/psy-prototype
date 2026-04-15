import { AppHeader } from "@/components/layout/app-header";
import { AdminAccountsTable } from "@/features/admin/components/admin-accounts-table";
import { AdminAutoSubmitSelect } from "@/features/admin/components/admin-auto-submit-select";
import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import { AdminSectionTabs } from "@/features/admin/components/admin-section-tabs";
import { AdminUserEditorLauncher } from "@/features/admin/components/admin-user-editor-launcher";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getAdminUsers, normalizeAdminUsersFilters } from "@/features/admin/lib/admin-service";
import type { AdminListedUser } from "@/features/admin/types";
import { getCurrentUser } from "@/features/auth/lib/current-user";

const ADMIN_TABS = [
  {
    href: "/admin/users",
    label: "Пользователи",
  },
  {
    href: "/admin/specialists",
    label: "Специалисты",
  },
] as const;

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
  const loadedUsers = await getAdminUsers(normalizedFilters);
  const users =
    section === "users"
      ? filterUsersSection(loadedUsers, normalizedFilters.role)
      : loadedUsers.filter((user) => user.role === "specialist");
  const selectedTabHref = section === "users" ? "/admin/users" : "/admin/specialists";

  return (
    <div className="surface-primary text-label-primary min-h-dvh overflow-x-auto">
      <AppHeader adminMode showCreateAction={false} showSearch={false} />

      <main className="mx-auto min-w-[1280px] max-w-[1400px] px-6 pb-10 pt-10">
        <div className="mb-6">
          <AdminSectionTabs items={[...ADMIN_TABS]} selectedKey={selectedTabHref} />
        </div>

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
      </main>
    </div>
  );
}
