import { LegalInfo } from "@/components/layout/legal-info";

export function LegalSidebar() {
  return (
    <aside className="surface-primary hidden lg:block lg:pl-[var(--app-shell-rail-gap)] lg:pr-[var(--app-shell-side-offset)]">
      <LegalInfo className="sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col justify-end overflow-y-auto pb-8 pt-11 xl:pl-8" />
    </aside>
  );
}
