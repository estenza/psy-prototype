"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { ResponsiveSelectionMenu } from "@/components/ui/responsive-selection-menu";

type AdminAutoSubmitSelectOption = {
  label: string;
  value: string;
};

type AdminAutoSubmitSelectProps = {
  label: string;
  name: string;
  options: AdminAutoSubmitSelectOption[];
  value: string;
  resetValue?: string;
};

export function AdminAutoSubmitSelect({
  label,
  name,
  options,
  value,
  resetValue = "all",
}: AdminAutoSubmitSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  function handleChange(nextValue: string) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextValue === resetValue) {
      nextSearchParams.delete(name);
    } else {
      nextSearchParams.set(name, nextValue);
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex min-w-[220px] flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <ResponsiveSelectionMenu
        ariaLabel={label}
        drawerTitle={label}
        value={value}
        onChange={handleChange}
        options={options}
        popoverPlacement="bottom start"
        popoverClassName="min-w-[220px]"
        triggerClassName="border-separator flex min-h-[40px] min-w-[220px] items-center justify-between gap-3 rounded-[16px] border bg-[var(--field-background)] px-3 py-2 text-left"
        trigger={(
          <>
            <span className="min-w-0 truncate">{selectedLabel}</span>
            <span className="flex h-3 w-3 flex-none items-center justify-center text-[var(--field-placeholder)]">
              <ChevronDownIcon />
            </span>
          </>
        )}
      />
    </div>
  );
}
