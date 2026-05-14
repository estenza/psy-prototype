import { AdminBrowserRedirect } from "@/features/admin/components/admin-browser-redirect";
import { AdminConsoleShell } from "@/features/admin/components/admin-console-shell";
import { requireModeratorPageAccess } from "@/features/admin/lib/admin-access";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { AdminPostsWorkspace } from "@/features/feed/components/admin-posts-workspace";
import {
  listAdminPosts,
  normalizeAdminPostsFilters,
} from "@/features/feed/lib/admin-posts-repository";
import { getUncheckedAdminReportsCounts } from "@/features/reports/lib/reports-service";

export default async function AdminPostsPage({
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
        href={`/access?next=${encodeURIComponent("/admin/posts")}`}
      />
    );
  }

  await requireModeratorPageAccess();

  const resolvedSearchParams = await searchParams;
  const filters = normalizeAdminPostsFilters(resolvedSearchParams);
  const [posts, uncheckedReportsCounts] = await Promise.all([
    listAdminPosts(filters),
    getUncheckedAdminReportsCounts(),
  ]);

  return (
    <AdminConsoleShell
      contentClassName="min-w-[1180px]"
      currentUser={currentUser}
      selectedHref="/admin/posts"
      uncheckedReportsCounts={uncheckedReportsCounts}
    >
      <AdminPostsWorkspace filters={filters} posts={posts} />
    </AdminConsoleShell>
  );
}
