import { LegalInfo } from "@/components/layout/legal-info";

export function LegalSidebar() {
  return (
    <aside className="surface-primary hidden min-[1140px]:block min-[1140px]:pr-[var(--app-shell-side-offset)]">
      <LegalInfo className="surface-primary border-separator sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col justify-end overflow-y-auto px-6 pb-8 pt-11 xl:px-8" />
    </aside>
  );
}
