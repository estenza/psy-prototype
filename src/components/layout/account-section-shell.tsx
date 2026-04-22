import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";

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
        <DesktopAppShell centerClassName="min-w-0">
          <section className="min-w-0 py-6 sm:py-8">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
              <header className="px-1 sm:px-0">
                <h1 className="type-page-title-lg text-[var(--label-primary)]">
                  {title}
                </h1>
                <p className="type-body-base mt-3 max-w-[620px] text-[var(--label-secondary)]">
                  {description}
                </p>
              </header>

              {children}
            </div>
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
