"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { NavIcon } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
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
    <aside className="surface-primary hidden lg:block lg:pl-[var(--app-shell-side-offset)]">
      <nav
        aria-label="Основная навигация"
        className="surface-primary border-separator sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col gap-1 overflow-y-auto pb-4 pr-6 pt-8"
      >
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={(event) => handleItemClick(event, item)}
            className={buttonClassName({
              className: `h-auto w-full justify-start gap-4 py-3 pl-4 pr-8 text-[20px] ${
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
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
