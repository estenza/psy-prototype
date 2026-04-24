import { LegalInfo } from "@/components/layout/legal-info";

type SidebarColumnProps = {
  hideContent?: boolean;
};

export function SidebarColumn({
  hideContent = false,
}: SidebarColumnProps) {
  return (
    <aside
      data-testid="sidebarColumn"
      className="surface-primary hidden min-[1140px]:flex min-[1140px]:min-h-full min-[1140px]:shrink-0 min-[1140px]:w-[var(--app-shell-sidebar-column-width)] min-[1140px]:min-w-[var(--app-shell-sidebar-column-width)] min-[1140px]:max-w-[var(--app-shell-sidebar-column-width)] min-[1140px]:flex-col"
    >
      <div
        data-testid="sidebarColumnHeightTrack"
        className="min-[1140px]:flex min-[1140px]:h-full min-[1140px]:min-h-full min-[1140px]:w-full min-[1140px]:flex-1 min-[1140px]:flex-col"
      >
        <div
          data-testid="sidebarColumnStickyShell"
          className="min-[1140px]:sticky min-[1140px]:top-0 min-[1140px]:flex min-[1140px]:h-[calc(100dvh-var(--app-header-height))] min-[1140px]:flex-col min-[1140px]:justify-end"
        >
          <div
            data-testid="sidebarColumnContent"
            className={`min-[1140px]:mt-auto min-[1140px]:w-full min-[1140px]:pb-6 ${
              hideContent ? "pointer-events-none invisible" : ""
            }`.trim()}
            aria-hidden={hideContent}
          >
            <LegalInfo className="w-full px-6 pb-8 pt-8 xl:px-8" />
          </div>
        </div>
      </div>
    </aside>
  );
}
