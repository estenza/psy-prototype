"use client";

import { Drawer } from "@heroui/react";
import { cn } from "@heroui/styles";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CheckIndicatorIcon } from "@/components/ui/icons";

export type MobileSelectionDrawerOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type MobileSelectionDrawerProps<TValue extends string> = {
  ariaLabel: string;
  isOpen: boolean;
  onChange: (value: TValue) => void;
  onOpenChange: (isOpen: boolean) => void;
  options: ReadonlyArray<MobileSelectionDrawerOption<TValue>>;
  renderOption?: (option: MobileSelectionDrawerOption<TValue>) => ReactNode;
  title?: string;
  value: TValue;
};

export function MobileSelectionDrawer<TValue extends string>({
  ariaLabel,
  isOpen,
  onChange,
  onOpenChange,
  options,
  renderOption,
  title,
  value,
}: MobileSelectionDrawerProps<TValue>) {
  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop variant="opaque">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="rounded-t-[28px] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] max-[480px]:rounded-t-[16px]">
            <Drawer.Handle />
            {title ? (
              <Drawer.Header className="px-1 pb-2 pt-1">
                <Drawer.Heading className="type-h3 font-semibold text-[var(--label-primary)]">
                  {title}
                </Drawer.Heading>
              </Drawer.Header>
            ) : null}
            <Drawer.Body className="m-0 max-h-[55vh] p-0 text-[16px] leading-6 text-[var(--label-primary)]">
              <div role="menu" aria-label={ariaLabel} className="flex flex-col gap-1">
                {options.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left font-normal transition-colors",
                        "text-[var(--label-primary)] active:bg-[var(--surface-secondary)]",
                        isSelected ? "text-[var(--accent-primary)]" : null,
                      )}
                      onClick={() => {
                        onChange(option.value);
                        onOpenChange(false);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        {renderOption ? renderOption(option) : option.label}
                      </span>
                      <span className="flex h-5 w-5 flex-none items-center justify-center text-[var(--accent-primary)]">
                        {isSelected ? <CheckIndicatorIcon /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Drawer.Body>
            <Drawer.Footer className="!mt-0 pt-4">
              <Button
                className="w-full"
                size="md"
                variant="secondary"
                onPress={() => onOpenChange(false)}
              >
                Отмена
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
