"use client";

import { useEffect, useRef } from "react";
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
    <div className="app-responsive-shell w-full min-w-0 min-[481px]:flex min-[481px]:h-[calc(100dvh-var(--app-header-height))] min-[481px]:overflow-x-clip min-[481px]:overflow-y-visible">
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
            ? "min-[481px]:flex min-[481px]:flex-col min-[481px]:items-center"
            : ""
        } min-[481px]:flex min-[481px]:h-full min-[481px]:min-h-0 min-[481px]:grow min-[481px]:basis-auto min-[481px]:flex-shrink min-[481px]:flex-col min-[481px]:items-start min-[481px]:overflow-x-clip min-[481px]:overflow-y-auto`.trim()}
      >
        {/* X-like layout: main itself grows to the right edge, and a narrower rail lives inside it. */}
        <div
          data-testid="mainRailWrapper"
          className={`app-shell-main-rail ${mainRailClassName} min-[481px]:flex min-[481px]:flex-1 min-[481px]:flex-col`.trim()}
        >
          <div
            data-testid="mainRailInner"
            className="app-shell-main-rail-inner w-full min-w-0 min-[481px]:flex min-[481px]:flex-1"
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
        <AppMobileTabBar />
      </main>
    </div>
  );
}
