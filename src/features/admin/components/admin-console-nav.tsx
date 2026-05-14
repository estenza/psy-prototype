"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { AdminReportsUncheckedCounts } from "@/features/reports/types";

const ADMIN_MENU_ITEMS = [
  {
    href: "/admin/users",
    label: "Пользователи",
  },
  {
    href: "/admin/specialists",
    label: "Специалисты",
  },
  {
    href: "/admin/posts",
    label: "Посты",
  },
  {
    href: "/admin/comments",
    label: "Комментарии",
  },
] as const;

const REPORTS_MENU_HREF = "/admin/reports";
const REPORTS_SUBMENU_ITEMS = [
  { label: "Посты", objectType: "post" },
  { label: "Комментарии", objectType: "comment" },
] as const;

const EMPTY_UNCHECKED_REPORTS_COUNTS: AdminReportsUncheckedCounts = {
  comment: 0,
  post: 0,
  total: 0,
};

type AdminConsoleNavProps = {
  selectedHref: string;
  uncheckedReportsCounts?: AdminReportsUncheckedCounts;
};

export function AdminConsoleNav({
  selectedHref,
  uncheckedReportsCounts = EMPTY_UNCHECKED_REPORTS_COUNTS,
}: AdminConsoleNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReportsActive = isItemActive(REPORTS_MENU_HREF);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(isReportsActive);
  const shouldShowReportsTotalBadge =
    !isReportsMenuOpen && uncheckedReportsCounts.total > 0;
  const activeReportObjectType =
    isReportsActive && (
      searchParams.get("objectType") === "post"
      || searchParams.get("objectType") === "comment"
    )
      ? searchParams.get("objectType")
      : "all";

  function isItemActive(href: string) {
    return pathname === href || (!pathname && selectedHref === href);
  }

  function getReportSectionHref(objectType: "comment" | "post") {
    const nextSearchParams = pathname === REPORTS_MENU_HREF
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();

    nextSearchParams.set("objectType", objectType);

    const queryString = nextSearchParams.toString();
    return queryString ? `${REPORTS_MENU_HREF}?${queryString}` : REPORTS_MENU_HREF;
  }

  function handleItemClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (!isItemActive(href)) {
      return;
    }

    event.preventDefault();
    router.refresh();
  }

  return (
    <nav aria-label="Админская навигация" className="flex flex-col items-stretch gap-1">
      {ADMIN_MENU_ITEMS.map((item) => {
        const isActive = isItemActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={(event) => handleItemClick(event, item.href)}
            className={buttonClassName({
              className: `app-menu-item w-full justify-start rounded-[16px] ${
                isActive
                  ? "app-menu-item--active font-semibold"
                  : "app-menu-item--inactive font-normal"
              }`,
              size: "lg",
              variant: "quaternary",
            })}
          >
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        );
      })}

      <div className="flex flex-col">
        <button
          type="button"
          aria-expanded={isReportsMenuOpen}
          aria-controls="admin-reports-submenu"
          aria-label={
            shouldShowReportsTotalBadge
              ? `Репорты, ${uncheckedReportsCounts.total} непроверенных`
              : "Репорты"
          }
          onClick={() => setIsReportsMenuOpen((currentValue) => !currentValue)}
          className={buttonClassName({
            className: `app-menu-item w-full justify-start gap-2 rounded-[16px] ${
              isReportsActive
                ? "app-menu-item--active font-semibold"
                : "app-menu-item--inactive font-normal"
            }`,
            size: "lg",
            variant: "quaternary",
          })}
        >
          <span className="min-w-0 truncate">Репорты</span>
          {shouldShowReportsTotalBadge ? (
            <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] px-2 text-[12px] font-semibold leading-none text-white">
              {uncheckedReportsCounts.total > 99 ? "99+" : uncheckedReportsCounts.total}
            </span>
          ) : null}
          <span
            className={`flex h-4 w-4 flex-none items-center justify-center text-[var(--label-tertiary)] transition-transform ${
              shouldShowReportsTotalBadge ? "" : "ml-auto"
            } ${
              isReportsMenuOpen ? "rotate-180" : ""
            }`.trim()}
            aria-hidden="true"
          >
            <ChevronDownIcon />
          </span>
        </button>

        {isReportsMenuOpen ? (
          <div
            id="admin-reports-submenu"
            className="mt-1 flex flex-col gap-1 pl-3"
          >
            {REPORTS_SUBMENU_ITEMS.map((item) => {
              const isSubmenuItemActive =
                isReportsActive && activeReportObjectType === item.objectType;
              const uncheckedCount = uncheckedReportsCounts[item.objectType];

              return (
                <Link
                  key={item.objectType}
                  href={getReportSectionHref(item.objectType)}
                  aria-current={isSubmenuItemActive ? "page" : undefined}
                  aria-label={
                    uncheckedCount > 0
                      ? `${item.label}, ${uncheckedCount} непроверенных`
                      : undefined
                  }
                  className={buttonClassName({
                    className: `app-menu-item w-full justify-start rounded-[14px] ${
                      isSubmenuItemActive
                        ? "app-menu-item--active font-semibold"
                        : "app-menu-item--inactive font-normal"
                    }`,
                    size: "sm",
                    variant: "quaternary",
                  })}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  {uncheckedCount > 0 ? (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1.5 text-[12px] font-semibold leading-none text-white">
                      {uncheckedCount > 99 ? "99+" : uncheckedCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
