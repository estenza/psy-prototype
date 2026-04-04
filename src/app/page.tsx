import { AppHeader } from "@/components/layout/app-header";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import { LeftNav } from "@/components/layout/left-nav";
import { LegalSidebar } from "@/components/layout/legal-sidebar";
import { FeedSection } from "@/features/feed/components/feed-section";

// The home route carries environment-specific branding, so we disable
// prerender caching to avoid stale staging visuals after a fresh deploy.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader />

      <div className="pt-[var(--app-header-height)]">
        <main className="mx-auto grid w-full grid-cols-1 gap-0 px-4 sm:px-6 xl:max-w-[var(--app-shell-max-width)] xl:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] xl:px-5">
          <LeftNav
            items={navItems}
            activeSection={DEFAULT_ACTIVE_SECTION}
          />

          <FeedSection />

          <LegalSidebar />
        </main>
      </div>
    </div>
  );
}
