import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import { AdminConsoleShell } from "@/features/admin/components/admin-console-shell";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { AdminReportsWorkspace } from "@/features/reports/components/admin-reports-workspace";
import {
  getAdminReports,
  getUncheckedAdminReportsCounts,
  normalizeAdminReportsFilters,
} from "@/features/reports/lib/reports-service";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    objectType?: string;
    reason?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <AdminBrowserRedirect
        href={`/access?next=${encodeURIComponent("/admin/reports")}`}
      />
    );
  }

  await requireModeratorPageAccess();

  const resolvedSearchParams = await searchParams;
  const filters = normalizeAdminReportsFilters(resolvedSearchParams);
  const [reports, uncheckedReportsCounts] = await Promise.all([
    getAdminReports(filters),
    getUncheckedAdminReportsCounts(),
  ]);

  return (
    <AdminConsoleShell
      contentClassName="min-w-[1180px]"
      currentUser={currentUser}
      selectedHref="/admin/reports"
      uncheckedReportsCounts={uncheckedReportsCounts}
    >
      <AdminReportsWorkspace filters={filters} reports={reports} />
    </AdminConsoleShell>
  );
}
