import { NavIcon } from "@/components/ui/icons";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type LeftNavProps = {
  items: readonly NavigationItem[];
  activeSection: NavigationItemKey;
};

export function LeftNav({ items, activeSection }: LeftNavProps) {
  return (
    <>
      <aside className="surface-primary hidden xl:block">
        <div className="sticky top-0 flex h-[calc(100vh-64px)] justify-end pl-10 pr-6">
          <div className="w-full max-w-[244px] py-4">
            <nav className="space-y-1">
              {items.map((item) => (
                <a
                  key={item.name}
                  href="#"
                  className={`flex items-center gap-4 rounded-full px-4 py-3 text-[19px] transition ${
                    item.key === activeSection
                      ? "bg-[var(--fill-secondary)] font-semibold text-[var(--label-primary)]"
                      : "font-normal text-[var(--label-secondary)] hover:bg-[var(--fill-control-hover)] hover:text-[var(--label-primary)]"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center">
                    <NavIcon name={item.key} filled={item.key === activeSection} />
                  </span>
                  <span>{item.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <div className="border-separator px-4 py-3 border-b xl:hidden">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              key={item.name}
              href="#"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                item.key === activeSection
                  ? "bg-[var(--fill-tertiary)] text-[var(--label-primary)]"
                  : "text-[var(--label-secondary)]"
              }`}
            >
              <NavIcon name={item.key} filled={item.key === activeSection} />
              <span>{item.name}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
