"use client";

import { ListBox, Select } from "@heroui/react";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import type { AppThemePreference } from "@/components/theme/app-theme-provider";
import { CheckIndicatorIcon } from "@/components/ui/icons";

const THEME_OPTIONS: Array<{
  label: string;
  value: AppThemePreference;
}> = [
  { label: "Светлая", value: "light" },
  { label: "Темная", value: "dark" },
  { label: "Системная", value: "system" },
];

export function ThemePreferenceCard() {
  const { setTheme, themePreference } = useAppTheme();
  const selectedItemClassName =
    "gap-0 !pl-4 !pr-4 py-2 font-normal transition-colors data-[selected=true]:text-[var(--accent-primary)]";
  const selectedItemIndicatorClassName =
    "!static !top-auto !right-auto !translate-y-0 ml-3 flex h-5 w-5 flex-none items-center justify-center text-[var(--accent-primary)]";
  const selectedThemeLabel =
    THEME_OPTIONS.find((option) => option.value === themePreference)?.label
    ?? "Светлая";

  return (
    <section className="surface-elevated rounded-[28px] p-6">
      <div className="flex flex-col gap-3">
        <label
          htmlFor="theme-preference"
          className="text-[16px] font-semibold text-[var(--label-primary)]"
        >
          Тема
        </label>

        <Select
          id="theme-preference"
          aria-label="Тема оформления"
          selectedKey={themePreference}
          onSelectionChange={(nextKey) => {
            if (typeof nextKey === "string") {
              setTheme(nextKey as AppThemePreference);
            }
          }}
          className="w-full max-w-[420px]"
        >
          <Select.Trigger className="min-h-[48px] rounded-[16px] px-4 py-[11px] text-[16px] font-normal leading-6 shadow-none">
            <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
              <span className="min-w-0 truncate">{selectedThemeLabel}</span>
            </Select.Value>
            <Select.Indicator className="right-4 text-[var(--field-placeholder)]" />
          </Select.Trigger>

          <Select.Popover placement="bottom start">
            <ListBox aria-label="Тема оформления" className="text-[16px] leading-6">
              <ListBox.Section>
                {THEME_OPTIONS.map((option) => (
                  <ListBox.Item
                    key={option.value}
                    id={option.value}
                    textValue={option.label}
                    className={selectedItemClassName}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-normal">
                        {option.label}
                      </span>
                      <ListBox.ItemIndicator className={selectedItemIndicatorClassName}>
                        {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                      </ListBox.ItemIndicator>
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </section>
  );
}
