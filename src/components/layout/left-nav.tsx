"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { NavIcon } from "@/components/ui/icons";
import { isNavigationItemCurrent } from "@/constants/navigation";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type LeftNavProps = {
  items: readonly NavigationItem[];
  activeSection: NavigationItemKey;
};

export function LeftNav({ items, activeSection }: LeftNavProps) {
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
    <aside className="surface-primary hidden lg:block lg:pl-[var(--app-shell-side-offset)] lg:pr-[var(--app-shell-rail-gap)]">
      <nav
        aria-label="Основная навигация"
        className="sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col gap-1 overflow-y-auto py-4"
      >
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={(event) => handleItemClick(event, item)}
            className={`flex w-full items-center gap-4 rounded-full py-3 pl-4 pr-8 text-[20px] transition ${
              item.key === activeSection
                ? "font-semibold text-[var(--label-primary)] hover:bg-[var(--fill-control-hover)]"
                : "font-normal text-[var(--label-tertiary)] hover:bg-[var(--fill-control-hover)]"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center">
              <NavIcon name={item.key} />
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
