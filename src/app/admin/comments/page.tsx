import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import { AdminConsoleShell } from "@/features/admin/components/admin-console-shell";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { AdminCommentsWorkspace } from "@/features/comments/components/admin-comments-workspace";
import {
  listAdminComments,
  normalizeAdminCommentsFilters,
} from "@/features/comments/lib/admin-comments-repository";
import { getUncheckedAdminReportsCounts } from "@/features/reports/lib/reports-service";

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <AdminBrowserRedirect
        href={`/access?next=${encodeURIComponent("/admin/comments")}`}
      />
    );
  }

  await requireModeratorPageAccess();

  const resolvedSearchParams = await searchParams;
  const filters = normalizeAdminCommentsFilters(resolvedSearchParams);
  const [comments, uncheckedReportsCounts] = await Promise.all([
    listAdminComments(filters),
    getUncheckedAdminReportsCounts(),
  ]);

  return (
    <AdminConsoleShell
      contentClassName="min-w-[1180px]"
      currentUser={currentUser}
      selectedHref="/admin/comments"
      uncheckedReportsCounts={uncheckedReportsCounts}
    >
      <AdminCommentsWorkspace comments={comments} filters={filters} />
    </AdminConsoleShell>
  );
}
