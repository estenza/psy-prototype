"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { MenuColumn } from "@/components/layout/menu-column";
import { PrimaryColumn } from "@/components/layout/primary-column";
import { SidebarColumn } from "@/components/layout/sidebar-column";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import type { NavigationItemKey } from "@/types/navigation";

type DesktopAppShellProps = {
  children: ReactNode;
  activeSection?: NavigationItemKey;
  showRightSidebar?: boolean;
  showMenuColumn?: boolean;
  hideMenuContent?: boolean;
  hideRightSidebarContent?: boolean;
  menuContent?: ReactNode;
  centerClassName?: string;
  fitCenterToContent?: boolean;
};

export function DesktopAppShell({
  children,
  activeSection = DEFAULT_ACTIVE_SECTION,
  showRightSidebar = true,
  showMenuColumn = true,
  hideMenuContent = false,
  hideRightSidebarContent = false,
  menuContent,
  centerClassName = "",
  fitCenterToContent = false,
}: DesktopAppShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const primaryColumnClassName = `w-full ${centerClassName}`.trim();
  const mainRailClassName = `min-w-0 ${
    showRightSidebar
      ? "min-[1140px]:min-w-[var(--app-shell-main-width)] min-[1140px]:w-fit"
      : "w-full"
  }`.trim();
  const tabletCenteredRailClassName = fitCenterToContent
    ? "min-[481px]:max-[720px]:w-full min-[481px]:max-[720px]:max-w-[672px] min-[721px]:max-w-none"
    : "";

  useEffect(() => {
    function handleWheel(event: WheelEvent) {
      if (window.innerWidth < 721 || event.ctrlKey || event.defaultPrevented) {
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
    <div className="w-full min-w-0 min-[721px]:flex min-[721px]:h-[calc(100dvh-var(--app-header-height))] min-[721px]:overflow-x-hidden min-[721px]:overflow-y-visible">
      {showMenuColumn ? (
        <MenuColumn
          items={navItems}
          activeSection={activeSection}
          hideContent={hideMenuContent}
          customContent={menuContent}
        />
      ) : null}

      <main
        ref={mainRef}
        className={`min-w-0 ${
          fitCenterToContent
            ? "min-[481px]:flex min-[481px]:flex-col min-[481px]:items-center"
            : ""
        } min-[721px]:flex min-[721px]:h-full min-[721px]:min-h-0 min-[721px]:grow min-[721px]:basis-auto min-[721px]:flex-shrink min-[721px]:flex-col min-[721px]:items-start min-[721px]:overflow-y-auto min-[721px]:overflow-x-hidden`.trim()}
      >
        {/* X-like layout: main itself grows to the right edge, and a narrower rail lives inside it. */}
        <div
          data-testid="mainRailWrapper"
          className={`${mainRailClassName} ${tabletCenteredRailClassName} min-[721px]:flex min-[721px]:flex-1 min-[721px]:flex-col`.trim()}
        >
          <div
            data-testid="mainRailInner"
            className="min-w-0 min-[721px]:flex min-[721px]:flex-1"
          >
            <div
              data-testid="mainColumnsRow"
              className={`min-w-0 w-full ${
                showRightSidebar
                  ? "min-[1140px]:flex min-[1140px]:flex-row min-[1140px]:items-start min-[1140px]:gap-[var(--app-shell-column-gap)]"
                  : ""
              }`.trim()}
            >
              <PrimaryColumn className={primaryColumnClassName}>{children}</PrimaryColumn>
              {showRightSidebar ? (
                <SidebarColumn hideContent={hideRightSidebarContent} />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
