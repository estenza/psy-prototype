export function LegalSidebar() {
  const legalItems = [
    "Условия",
    "Конфиденциальность",
    "Cookies",
    "Правила сообщества",
    "Контакты",
  ] as const;

  return (
    <aside className="surface-primary hidden lg:block lg:pl-[var(--app-shell-rail-gap)] lg:pr-[var(--app-shell-side-offset)]">
      <section
        className="text-label-quaternary sticky top-[var(--app-header-height)] flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col justify-end overflow-y-auto pb-8 pt-11 text-xs leading-5 xl:pl-8"
      >
        <p>© 2026 внутри</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {legalItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </aside>
  );
}
