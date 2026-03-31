export function LegalSidebar() {
  const legalItems = [
    "Условия",
    "Конфиденциальность",
    "Cookies",
    "Правила сообщества",
    "Контакты",
  ] as const;

  return (
    <aside className="surface-primary hidden xl:block">
      <div className="sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] justify-start pl-6 pr-10">
        <div className="h-full w-full max-w-[var(--app-shell-side-rail-width)] overflow-y-auto">
          <div className="flex min-h-full flex-col justify-end pl-8 pb-8 pt-6">
            <section className="text-label-secondary pt-5 text-xs leading-5">
              <div>© 2026 внутри</div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {legalItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </aside>
  );
}
