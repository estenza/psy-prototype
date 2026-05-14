"use client";

import PullToRefresh from "react-simple-pull-to-refresh";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppMobileTabBar } from "@/components/layout/app-header";
import { MenuColumn } from "@/components/layout/menu-column";
import { PrimaryColumn } from "@/components/layout/primary-column";
import { SidebarColumn } from "@/components/layout/sidebar-column";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import type { NavigationItemKey } from "@/types/navigation";

type DesktopAppShellProps = {
  children: ReactNode;
  activeSection?: NavigationItemKey | null;
  compactMenuWidth?: "default" | "narrow";
  showRightSidebar?: boolean;
  showMenuColumn?: boolean;
  hideMenuContent?: boolean;
  hideRightSidebarContent?: boolean;
  menuContent?: ReactNode;
  sidebarContent?: ReactNode;
  sidebarPlacement?: "start" | "end";
  centerClassName?: string;
  fitCenterToContent?: boolean;
};

function useIsMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 480px)");

    function syncViewport() {
      setIsMobileViewport(mediaQuery.matches);
    }

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  return isMobileViewport;
}

function MobilePullToRefreshShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isMobileViewport = useIsMobileViewport();

  const handleRefresh = useCallback(() => {
    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        router.refresh();
        resolve();
      }, 650);
    });
  }, [router]);

  if (!isMobileViewport) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      className="app-mobile-pull-to-refresh"
      maxPullDownDistance={88}
      onRefresh={handleRefresh}
      pullDownThreshold={58}
      pullingContent={null}
      refreshingContent={<span className="app-mobile-pull-refresh__spinner" />}
      resistance={1.35}
    >
      {children}
    </PullToRefresh>
  );
}

export function DesktopAppShell({
  children,
  activeSection = DEFAULT_ACTIVE_SECTION,
  compactMenuWidth = "default",
  showRightSidebar = true,
  showMenuColumn = true,
  hideMenuContent = false,
  hideRightSidebarContent = false,
  menuContent,
  sidebarContent,
  sidebarPlacement = "end",
  centerClassName = "",
  fitCenterToContent = false,
}: DesktopAppShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const primaryColumnClassName = `w-full ${centerClassName}`.trim();
  const mainRailClassName = `min-w-0 ${
    showRightSidebar
      ? "w-full min-[1140px]:min-w-[var(--app-shell-main-width)] min-[1140px]:w-fit"
      : "w-full"
  }`.trim();
  const sidebarColumn = showRightSidebar ? (
    <SidebarColumn hideContent={hideRightSidebarContent}>
      {sidebarContent}
    </SidebarColumn>
  ) : null;
  const shellContent = (
    <div
      data-testid="mainRailWrapper"
      className={`app-shell-main-rail ${mainRailClassName} min-[480px]:flex min-[480px]:flex-1 min-[480px]:flex-col`.trim()}
    >
      <div
        data-testid="mainRailInner"
        className="app-shell-main-rail-inner w-full min-w-0 min-[480px]:flex min-[480px]:flex-1"
      >
        <div
          data-testid="mainColumnsRow"
          className={`app-shell-main-columns min-w-0 w-full ${
            showRightSidebar
              ? "min-[1140px]:flex min-[1140px]:flex-row min-[1140px]:items-start min-[1140px]:gap-[var(--app-shell-column-gap)]"
              : ""
          }`.trim()}
        >
          {sidebarPlacement === "start" ? sidebarColumn : null}
          <PrimaryColumn className={primaryColumnClassName}>{children}</PrimaryColumn>
          {sidebarPlacement === "end" ? sidebarColumn : null}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    function handleWheel(event: WheelEvent) {
      if (window.innerWidth < 481 || event.ctrlKey || event.defaultPrevented) {
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;

      if (target?.closest('[data-allow-native-wheel="true"]')) {
        return;
      }

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.deltaY === 0) {
        return;
      }

      const scrollContainer = mainRef.current;

      if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
        return;
      }

      event.preventDefault();
      scrollContainer.scrollBy({
        top: event.deltaY,
        left: 0,
        behavior: "auto",
      });
    }

    document.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      document.removeEventListener("wheel", handleWheel, true);
    };
  }, []);

  return (
    <div className="app-responsive-shell w-full min-w-0 min-[480px]:flex min-[480px]:h-[calc(100dvh-var(--app-header-height))] min-[480px]:overflow-x-clip min-[480px]:overflow-y-visible">
      {showMenuColumn ? (
        <MenuColumn
          items={navItems}
          activeSection={activeSection}
          compactWidth={compactMenuWidth}
          hideContent={hideMenuContent}
          customContent={menuContent}
        />
      ) : null}

      <main
        ref={mainRef}
        className={`app-shell-main min-w-0 ${
          fitCenterToContent
            ? "min-[480px]:flex min-[480px]:flex-col min-[480px]:items-center"
            : ""
        } min-[480px]:flex min-[480px]:h-full min-[480px]:min-h-0 min-[480px]:grow min-[480px]:basis-auto min-[480px]:flex-shrink min-[480px]:flex-col min-[480px]:items-start min-[480px]:overflow-x-clip min-[480px]:overflow-y-auto`.trim()}
      >
        {/* X-like layout: main itself grows to the right edge, and a narrower rail lives inside it. */}
        <MobilePullToRefreshShell>{shellContent}</MobilePullToRefreshShell>
        <AppMobileTabBar />
      </main>
    </div>
  );
}
