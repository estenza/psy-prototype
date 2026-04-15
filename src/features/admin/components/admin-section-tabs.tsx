"use client";

import { Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";

type AdminSectionTabsProps = {
  items: Array<{
    href: string;
    label: string;
  }>;
  selectedKey: string;
};

export function AdminSectionTabs({
  items,
  selectedKey,
}: AdminSectionTabsProps) {
  const router = useRouter();

  return (
    <Tabs
      className="w-[296px]"
      selectedKey={selectedKey}
      onSelectionChange={(key) => router.push(String(key))}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Разделы администратора">
          {items.map((item, index) => (
            <Tabs.Tab key={item.href} id={item.href}>
              {index > 0 ? <Tabs.Separator /> : null}
              {item.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
