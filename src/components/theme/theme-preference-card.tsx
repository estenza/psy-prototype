"use client";

import { useAppTheme } from "@/components/theme/app-theme-provider";

export function ThemePreferenceCard() {
  const { theme, toggleTheme } = useAppTheme();
  const themeLabel = theme === "dark" ? "Темная" : "Светлая";
  const nextThemeLabel = theme === "dark" ? "Переключить на светлую" : "Переключить на темную";

  return (
    <section className="surface-elevated border-separator rounded-[28px] border p-2 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={toggleTheme}
        className="comment-menu-item flex w-full cursor-pointer items-center justify-between gap-4 rounded-[22px] px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[var(--label-primary)]">
            Тема
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
            {nextThemeLabel}. Выбор сохраняется на этом устройстве.
          </p>
        </div>

        <span className="inline-flex flex-none items-center rounded-full bg-[var(--fill-secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--label-primary)]">
          {themeLabel}
        </span>
      </button>
    </section>
  );
}
