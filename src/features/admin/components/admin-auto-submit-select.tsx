"use client";

import { ListBox, Select } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
      <Select
        aria-label={label}
        selectedKey={value}
        onSelectionChange={(nextKey) => {
          if (typeof nextKey === "string") {
            handleChange(nextKey);
          }
        }}
        className="min-w-[220px]"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox items={options}>
            {(option) => (
              <ListBox.Item id={option.value} textValue={option.label}>
                <span className="flex items-center justify-between gap-3">
                  <span>{option.label}</span>
                  <ListBox.ItemIndicator />
                </span>
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
