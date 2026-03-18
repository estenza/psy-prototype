export function LegalSidebar() {
  return (
    <aside className="surface-primary border-separator hidden border-l xl:block">
      <div className="sticky top-0 flex h-[calc(100vh-64px)] justify-start pl-6 pr-10">
        <div className="mt-auto w-full max-w-[244px] pl-8 pb-8 pt-6">
          <section className="text-label-secondary pt-5 text-xs leading-5">
            <div>© 2026 внутри</div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              <a href="#" className="cursor-pointer hover:text-[var(--label-primary)]">
                Условия
              </a>
              <a href="#" className="cursor-pointer hover:text-[var(--label-primary)]">
                Конфиденциальность
              </a>
              <a href="#" className="cursor-pointer hover:text-[var(--label-primary)]">
                Cookies
              </a>
              <a href="#" className="cursor-pointer hover:text-[var(--label-primary)]">
                Правила сообщества
              </a>
              <a href="#" className="cursor-pointer hover:text-[var(--label-primary)]">
                Контакты
              </a>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
