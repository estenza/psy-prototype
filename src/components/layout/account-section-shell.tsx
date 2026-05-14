import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import type { NavigationItemKey } from "@/types/navigation";

export function AccountSectionShell({
  activeSection = "forum",
  children,
  description,
  descriptionClassName = "type-body-base mt-3 max-w-[620px] text-[var(--label-secondary)]",
  contentClassName = "flex w-full min-w-0 flex-col gap-6",
  header,
  sectionClassName = "w-full min-w-0 pb-6 min-[480px]:pb-8",
  centerClassName = "w-full max-w-[672px]",
  sidebarContent,
  title,
}: {
  activeSection?: NavigationItemKey | null;
  children: React.ReactNode;
  centerClassName?: string;
  description?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  header?: React.ReactNode;
  sectionClassName?: string;
  sidebarContent?: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[480px]:min-h-dvh">
      <AppHeader />

      <div className="min-[480px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          activeSection={activeSection}
          centerClassName={centerClassName}
          fitCenterToContent
          sidebarContent={sidebarContent}
        >
          <section className={sectionClassName}>
            <div className={contentClassName}>
              {header ? header : null}

              {title || description ? (
                <header className="px-1 min-[480px]:px-0">
                  {title ? (
                    <h1 className="type-h1 font-bold text-[var(--label-primary)]">
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
