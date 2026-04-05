import { AppHeader } from "@/components/layout/app-header";
import { LeftNav } from "@/components/layout/left-nav";
import { LegalSidebar } from "@/components/layout/legal-sidebar";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";

export function AccountSectionShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <main className="mx-auto grid w-full grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] lg:px-0 min-[1441px]:max-w-[var(--app-shell-max-width)] min-[1441px]:px-5">
          <LeftNav
            items={navItems}
            activeSection={DEFAULT_ACTIVE_SECTION}
          />

          <section className="min-w-0 py-6 sm:py-8">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
              <header className="px-1 sm:px-0">
                <h1 className="font-helvetica text-[30px] font-bold leading-none text-[var(--label-primary)]">
                  {title}
                </h1>
                <p className="mt-3 max-w-[620px] text-[15px] leading-6 text-[var(--label-secondary)]">
                  {description}
                </p>
              </header>

              {children}
            </div>
          </section>

          <LegalSidebar />
        </main>
      </div>
    </div>
  );
}
