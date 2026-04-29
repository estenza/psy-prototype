import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { isAdminConsoleRequest } from "@/features/admin/lib/admin-console-request";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import { FeedSection } from "@/features/feed/components/feed-section";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { listPosts } from "@/features/feed/lib/posts-repository";

// The home route carries environment-specific branding, so we disable
// prerender caching to avoid stale staging visuals after a fresh deploy.
export const dynamic = "force-dynamic";

export default async function Home() {
  const adminConsoleRequest = await isAdminConsoleRequest();
  const currentUser = await getCurrentUser();

  if (adminConsoleRequest) {
    redirect(canAccessAdminConsole(currentUser) ? "/admin/users" : "/sign-in");
  }

  const posts = await listPosts(currentUser);

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[481px]:min-h-dvh">
      <AppHeader />

      <div className="min-[481px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <FeedSection initialPosts={posts} />
        </DesktopAppShell>
      </div>
    </div>
  );
}
