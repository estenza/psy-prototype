"use client";

import { BellIcon, SearchIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

type AppHeaderProps = {
  profileInitials: string;
  profileToneClass: string;
};

export function AppHeader({
  profileInitials,
  profileToneClass,
}: AppHeaderProps) {
  return (
    <header className="surface-primary border-separator border-b">
      <div className="mx-auto flex h-16 w-full max-w-[1560px] items-center gap-3 px-4 py-1 sm:px-6 xl:grid xl:grid-cols-[340px_minmax(0,720px)_340px] xl:px-8">
        <div className="flex flex-none items-center xl:justify-end xl:pl-10 xl:pr-6">
          <div className="-ml-[52px] w-full max-w-[244px]">
            <a
              href="#"
              className="text-label-primary cursor-pointer text-[32px] font-black leading-none tracking-[0.01em]"
            >
              внутри
            </a>
          </div>
        </div>

        <div className="hidden items-center justify-center xl:flex">
          <label className="search-field flex w-[560px] items-center gap-3 rounded-full px-5 py-3 text-sm transition">
            <SearchIcon />
            <input
              type="search"
              placeholder="Поиск по историям, темам, психологам"
              className="text-label-primary w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-[var(--label-secondary)]"
            />
          </label>
        </div>

        <div className="hidden xl:block xl:pl-6 xl:pr-10">
          <div className="flex items-center justify-start gap-4">
            <button className="text-label-inverse inline-flex min-w-[184px] cursor-pointer items-center justify-center rounded-full bg-[var(--label-primary)] px-7 py-3 text-sm font-semibold transition hover:opacity-90">
              <span>Создать тему</span>
            </button>

            <button
              aria-label="Уведомление"
              className="interactive-fill group/tooltip relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full transition"
            >
              <BellIcon />
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-like)] px-1 text-[10px] font-semibold text-[var(--label-inverse)]">
                3
              </span>
              <HoverTooltip label="Уведомление" />
            </button>

            <button
              className={`relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${profileToneClass}`}
            >
              {profileInitials}
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--background-primary)] bg-[var(--accent-success)]" />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 xl:hidden">
          <label className="search-field flex min-w-0 flex-1 items-center gap-3 rounded-full px-4 py-3 text-sm transition">
            <SearchIcon />
            <input
              type="search"
              placeholder="Поиск"
              className="text-label-primary w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-[var(--label-secondary)]"
            />
          </label>
          <button className="inline-flex cursor-pointer items-center rounded-full bg-[var(--label-primary)] px-5 py-3 text-sm font-semibold text-[var(--label-inverse)] transition hover:opacity-90">
            <span className="hidden sm:inline">Создать тему</span>
            <span className="sm:hidden">Тема</span>
          </button>
          <button
            aria-label="Уведомление"
            className="interactive-fill group/tooltip relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full transition"
          >
            <BellIcon />
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-like)] px-1 text-[10px] font-semibold text-[var(--label-inverse)]">
              3
            </span>
            <HoverTooltip label="Уведомление" />
          </button>
          <button
            className={`relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${profileToneClass}`}
          >
            {profileInitials}
            <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--background-primary)] bg-[var(--accent-success)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
