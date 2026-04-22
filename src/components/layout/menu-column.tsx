"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { NavIcon } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { isNavigationItemCurrent } from "@/constants/navigation";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type MenuColumnProps = {
  items: readonly NavigationItem[];
  activeSection: NavigationItemKey;
};

export function MenuColumn({ items, activeSection }: MenuColumnProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleItemClick(
    event: MouseEvent<HTMLAnchorElement>,
    item: NavigationItem,
  ) {
    if (!isNavigationItemCurrent(pathname, item)) {
      return;
    }

    event.preventDefault();
    router.refresh();
  }

  return (
    <div
      data-testid="menuColumn"
      className="hidden min-[721px]:relative min-[721px]:z-[3] min-[721px]:flex min-[721px]:h-full min-[721px]:min-w-0 min-[721px]:grow min-[721px]:basis-auto min-[721px]:flex-col min-[721px]:shrink-0 min-[721px]:items-end"
    >
      <div
        data-testid="menuColumnInner"
        className="flex min-w-0 min-[721px]:h-full w-[calc(var(--app-shell-nav-compact-width)+24px)] min-[1296px]:w-[calc(var(--app-shell-nav-width)+24px)] items-stretch justify-end pl-2 pr-4 transition-[width] duration-200 ease-out"
      >
        <aside className="relative z-10 min-[721px]:h-full w-[var(--app-shell-nav-compact-width)] min-w-[var(--app-shell-nav-compact-width)] min-[1296px]:w-[var(--app-shell-nav-width)] min-[1296px]:min-w-[var(--app-shell-nav-width)]">
          <nav
            aria-label="Основная навигация"
            data-testid="menuRail"
            className="surface-primary border-separator flex min-[721px]:h-full w-[var(--app-shell-nav-compact-width)] min-[1296px]:w-[var(--app-shell-nav-width)] flex-col items-stretch gap-1 overflow-hidden px-0 pb-4 pt-8"
          >
            {items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={(event) => handleItemClick(event, item)}
                aria-label={item.name}
                className={buttonClassName({
                  className: `h-auto w-full justify-center gap-0 rounded-[999px] px-0 py-3 min-[1296px]:justify-start min-[1296px]:gap-4 min-[1296px]:pl-4 min-[1296px]:pr-8 text-[20px] ${
                    item.key === activeSection
                      ? "font-semibold text-[var(--label-primary)]"
                      : "font-normal text-[var(--label-tertiary)]"
                  }`,
                  size: "lg",
                  variant: "tertiary",
                })}
              >
                <span className="flex h-8 w-8 items-center justify-center">
                  <NavIcon name={item.key} filled={item.key === activeSection} />
                </span>
                <span className="hidden min-[1296px]:inline">{item.name}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
