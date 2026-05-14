"use client";

import { Dropdown, Label } from "@heroui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { CheckIndicatorIcon } from "@/components/ui/icons";
import {
  MobileSelectionDrawer,
  type MobileSelectionDrawerOption,
} from "@/components/ui/mobile-selection-drawer";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";

type ResponsiveSelectionMenuProps<TValue extends string> = {
  ariaLabel: string;
  drawerTitle?: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<MobileSelectionDrawerOption<TValue>>;
  popoverClassName?: string;
  popoverPlacement?: "bottom start" | "bottom end" | "top start" | "top end";
  renderOption?: (option: MobileSelectionDrawerOption<TValue>) => ReactNode;
  trigger: ReactNode;
  triggerClassName?: string;
  value: TValue;
};

export function ResponsiveSelectionMenu<TValue extends string>({
  ariaLabel,
  drawerTitle,
  onChange,
  options,
  popoverClassName,
  popoverPlacement = "bottom start",
  renderOption,
  trigger,
  triggerClassName,
  value,
}: ResponsiveSelectionMenuProps<TValue>) {
  const isMobileViewport = useMobileViewport();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isDrawerOpen}
          className={triggerClassName}
          onClick={() => setIsDrawerOpen(true)}
        >
          {trigger}
        </button>
        <MobileSelectionDrawer
          ariaLabel={ariaLabel}
          isOpen={isDrawerOpen}
          onChange={onChange}
          onOpenChange={setIsDrawerOpen}
          options={options}
          renderOption={renderOption}
          title={drawerTitle}
          value={value}
        />
      </>
    );
  }

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className={triggerClassName}>{trigger}</Dropdown.Trigger>
      <DropdownPopover placement={popoverPlacement} className={popoverClassName}>
        <Dropdown.Menu
          className="dropdown-menu-default"
          selectionMode="single"
          selectedKeys={new Set([value])}
          onAction={(key) => onChange(String(key) as TValue)}
        >
          {options.map((option) => (
            <Dropdown.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2"
            >
              <Dropdown.ItemIndicator className="!static !translate-y-0 flex h-5 w-5 items-center justify-center text-[var(--accent-primary)]">
                {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
              </Dropdown.ItemIndicator>
              <Label className="min-w-0">{renderOption ? renderOption(option) : option.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </DropdownPopover>
    </Dropdown.Root>
  );
}
