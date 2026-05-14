"use client";

import { Drawer, Dropdown, Label } from "@heroui/react";
import { cn } from "@heroui/styles";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";

export type ResponsiveActionMenuItem<TId extends string> = {
  id: TId;
  icon?: ReactNode;
  isDisabled?: boolean;
  label: string;
  labelClassName?: string;
  onSelect: () => void | Promise<void>;
};

type ResponsiveActionMenuProps<TId extends string> = {
  ariaLabel: string;
  drawerTitle?: string;
  items: ReadonlyArray<ResponsiveActionMenuItem<TId>>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  popoverClassName?: string;
  popoverPlacement?: "bottom start" | "bottom end" | "top start" | "top end";
  renderTrigger: (params: {
    isOpen: boolean;
    isMobile: boolean;
    open: () => void;
  }) => ReactNode;
};

export function ResponsiveActionMenu<TId extends string>({
  ariaLabel,
  drawerTitle,
  isOpen,
  items,
  onOpenChange,
  popoverClassName,
  popoverPlacement = "bottom end",
  renderTrigger,
}: ResponsiveActionMenuProps<TId>) {
  const isMobileViewport = useMobileViewport();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const actualIsOpen = isOpen ?? internalIsOpen;

  function setOpen(nextIsOpen: boolean) {
    setInternalIsOpen(nextIsOpen);
    onOpenChange?.(nextIsOpen);
  }

  function handleSelect(item: ResponsiveActionMenuItem<TId>) {
    if (item.isDisabled) return;
    setOpen(false);
    void item.onSelect();
  }

  if (isMobileViewport) {
    return (
      <>
        {renderTrigger({
          isOpen: actualIsOpen,
          isMobile: true,
          open: () => setOpen(true),
        })}
        <Drawer.Root isOpen={actualIsOpen} onOpenChange={setOpen}>
          <Drawer.Backdrop variant="opaque">
            <Drawer.Content placement="bottom">
              <Drawer.Dialog className="rounded-t-[28px] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] max-[480px]:rounded-t-[16px]">
                <Drawer.Handle />
                {drawerTitle ? (
                  <Drawer.Header className="px-1 pb-2 pt-1">
                    <Drawer.Heading className="type-h3 font-semibold text-[var(--label-primary)]">
                      {drawerTitle}
                    </Drawer.Heading>
                  </Drawer.Header>
                ) : null}
                <Drawer.Body className="m-0 max-h-[55vh] p-0 text-[16px] leading-6 text-[var(--label-primary)]">
                  <div role="menu" aria-label={ariaLabel} className="flex flex-col gap-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        disabled={item.isDisabled}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left font-normal transition-colors",
                          "text-[var(--label-primary)] active:bg-[var(--surface-secondary)]",
                          "disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]",
                        )}
                        onClick={() => handleSelect(item)}
                      >
                        {item.icon ? (
                          <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                            {item.icon}
                          </span>
                        ) : null}
                        <span className={cn("min-w-0 flex-1 truncate", item.labelClassName)}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </Drawer.Body>
                <Drawer.Footer className="!mt-0 pt-4">
                  <Button
                    className="w-full"
                    size="md"
                    variant="secondary"
                    onPress={() => setOpen(false)}
                  >
                    Отмена
                  </Button>
                </Drawer.Footer>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer.Root>
      </>
    );
  }

  return (
    <Dropdown.Root isOpen={actualIsOpen} onOpenChange={setOpen}>
      {renderTrigger({
        isOpen: actualIsOpen,
        isMobile: false,
        open: () => setOpen(true),
      })}

      <DropdownPopover placement={popoverPlacement} className={popoverClassName}>
        <Dropdown.Menu
          aria-label={ariaLabel}
          selectionMode="none"
          className="dropdown-menu-default"
          onAction={(key) => {
            const item = items.find((entry) => entry.id === key);
            if (item) handleSelect(item);
          }}
        >
          {items.map((item) => (
            <Dropdown.Item
              key={item.id}
              id={item.id}
              textValue={item.label}
              isDisabled={item.isDisabled}
            >
              <div className="flex w-full items-center gap-3">
                {item.icon ? (
                  <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                    {item.icon}
                  </span>
                ) : null}
                <Label className={cn("min-w-0 flex-1 truncate", item.labelClassName)}>
                  {item.label}
                </Label>
              </div>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </DropdownPopover>
    </Dropdown.Root>
  );
}
