import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";

export function AccountSectionShell({
  children,
  description,
  descriptionClassName = "type-body-base mt-3 max-w-[620px] text-[var(--label-secondary)]",
  contentClassName = "flex w-full min-w-0 flex-col gap-6",
  header,
  sectionClassName = "w-full min-w-0 py-6 sm:py-8",
  title,
}: {
  children: React.ReactNode;
  description?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  header?: React.ReactNode;
  sectionClassName?: string;
  title?: string;
}) {
  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[721px]:min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <section className={sectionClassName}>
            <div className={contentClassName}>
              {header ? header : null}

              {title || description ? (
                <header className="px-1 sm:px-0">
                  {title ? (
                    <h1 className="type-page-title-lg text-[var(--label-primary)]">
                      {title}
                    </h1>
                  ) : null}
                  {description ? (
                    <p className={descriptionClassName}>
                      {description}
                    </p>
                  ) : null}
                </header>
              ) : null}

              {children}
            </div>
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
