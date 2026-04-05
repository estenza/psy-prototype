import Link from "next/link";
import { NavIcon } from "@/components/ui/icons";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type LeftNavProps = {
  items: readonly NavigationItem[];
  activeSection: NavigationItemKey;
};

export function LeftNav({ items, activeSection }: LeftNavProps) {
  return (
    <aside className="surface-primary hidden lg:block lg:pl-[var(--app-shell-side-offset)] lg:pr-[var(--app-shell-rail-gap)]">
      <nav
        aria-label="Основная навигация"
        className="sticky top-[var(--app-header-height)] h-[calc(100dvh-var(--app-header-height))] w-full overflow-y-auto py-4"
      >
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex w-full items-center gap-4 rounded-full py-3 pl-4 pr-8 text-[20px] transition ${
              item.key === activeSection
                ? "bg-[var(--fill-secondary)] font-semibold text-[var(--label-primary)]"
                : "font-normal text-[var(--label-secondary)] hover:bg-[var(--fill-control-hover)]"
            }`}
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
