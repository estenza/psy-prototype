"use client";

import { ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import type { AppThemePreference } from "@/components/theme/app-theme-provider";
import {
  fieldControlSelectItemClassName,
  fieldControlSelectItemIndicatorClassName,
  fieldControlSelectButtonClassName,
  fieldControlSelectTriggerClassName,
} from "@/components/ui/field-control";
import { CheckIndicatorIcon, ChevronDownIcon } from "@/components/ui/icons";
import { MobileSelectionDrawer } from "@/components/ui/mobile-selection-drawer";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";

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
  const isMobileViewport = useMobileViewport();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

        {isMobileViewport ? (
          <div className="w-full max-w-[420px]">
            <button
              id="theme-preference"
              type="button"
              aria-label="Тема оформления"
              aria-haspopup="dialog"
              aria-expanded={isDrawerOpen}
              className={fieldControlSelectButtonClassName}
              onClick={() => setIsDrawerOpen(true)}
            >
              <span className="min-w-0 truncate">{selectedThemeLabel}</span>
              <span className="flex h-3 w-3 flex-none items-center justify-center text-[var(--field-placeholder)]">
                <ChevronDownIcon />
              </span>
            </button>
            <MobileSelectionDrawer
              ariaLabel="Тема оформления"
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              options={THEME_OPTIONS}
              value={themePreference}
              onChange={(nextTheme) => setTheme(nextTheme)}
            />
          </div>
        ) : (
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
            <Select.Trigger className={fieldControlSelectTriggerClassName}>
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
                      className={fieldControlSelectItemClassName}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-normal">
                          {option.label}
                        </span>
                        <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                          {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                        </ListBox.ItemIndicator>
                      </span>
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>
    </section>
  );
}
