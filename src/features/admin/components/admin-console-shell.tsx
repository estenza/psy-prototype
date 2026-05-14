"use client";

import { cn } from "@heroui/styles";
import Link from "next/link";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import type { SessionUser } from "@/features/auth/types";
import { AdminConsoleNav } from "@/features/admin/components/admin-console-nav";
import { AdminSignOutButton } from "@/features/admin/components/admin-sign-out-button";
import type { AdminReportsUncheckedCounts } from "@/features/reports/types";

const ADMIN_MENU_COLUMN_DEFAULT_WIDTH = 280;
const ADMIN_MENU_COLUMN_MAX_WIDTH = 280;
const ADMIN_MENU_COLUMN_MIN_WIDTH = 200;
const ADMIN_MENU_COLUMN_STORAGE_KEY = "vnutri:admin-menu-column-width";

const ADMIN_SECTION_TITLES: Record<string, string> = {
  "/admin/comments": "Комментарии",
  "/admin/posts": "Посты",
  "/admin/reports": "Репорты",
  "/admin/specialists": "Специалисты",
  "/admin/users": "Пользователи",
};

type AdminConsoleShellProps = {
  children: ReactNode;
  contentClassName?: string;
  currentUser: SessionUser;
  selectedHref: string;
  uncheckedReportsCounts?: AdminReportsUncheckedCounts;
};

function clampMenuColumnWidth(width: number) {
  return Math.min(
    ADMIN_MENU_COLUMN_MAX_WIDTH,
    Math.max(ADMIN_MENU_COLUMN_MIN_WIDTH, width),
  );
}

export function AdminConsoleShell({
  children,
  contentClassName = "",
  currentUser,
  selectedHref,
  uncheckedReportsCounts,
}: AdminConsoleShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const menuColumnWidthRef = useRef(ADMIN_MENU_COLUMN_DEFAULT_WIDTH);
  const resizeStateRef = useRef<{
    initialPointerX: number;
    initialWidth: number;
  } | null>(null);
  const profileNickname = currentUser.nickname
    ? `@${currentUser.nickname}`
    : currentUser.email;
  const sectionTitle = ADMIN_SECTION_TITLES[selectedHref] ?? "";

  useEffect(() => {
    const storedWidth = window.localStorage.getItem(ADMIN_MENU_COLUMN_STORAGE_KEY);
    const parsedWidth = storedWidth ? Number(storedWidth) : Number.NaN;

    if (Number.isFinite(parsedWidth)) {
      const nextWidth = clampMenuColumnWidth(parsedWidth);
      menuColumnWidthRef.current = nextWidth;
      shellRef.current?.style.setProperty("--admin-menu-column-width", `${nextWidth}px`);
    }
  }, []);

  function handleResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    resizeStateRef.current = {
      initialPointerX: event.clientX,
      initialWidth: menuColumnWidthRef.current,
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      const resizeState = resizeStateRef.current;

      if (!resizeState) {
        return;
      }

      const nextWidth = clampMenuColumnWidth(
        resizeState.initialWidth + moveEvent.clientX - resizeState.initialPointerX,
      );

      menuColumnWidthRef.current = nextWidth;
      shellRef.current?.style.setProperty("--admin-menu-column-width", `${nextWidth}px`);
      window.localStorage.setItem(ADMIN_MENU_COLUMN_STORAGE_KEY, String(nextWidth));
    }

    function handlePointerUp() {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <div
      ref={shellRef}
      className="surface-primary text-label-primary grid min-h-dvh overflow-x-auto"
      style={{
        "--admin-menu-column-width": `${ADMIN_MENU_COLUMN_DEFAULT_WIDTH}px`,
        gridTemplateColumns: "var(--admin-menu-column-width) minmax(0, 1fr)",
      } as CSSProperties}
    >
      <aside
        className="surface-primary border-separator relative flex min-h-dvh flex-col border-r px-4 py-5"
      >
        <Link
          href="/admin/users"
          className="mb-8 inline-flex items-center gap-2 px-4 text-[32px] font-semibold leading-none text-[var(--accent-primary)] no-underline"
        >
          внутри.
        </Link>

        <AdminConsoleNav
          selectedHref={selectedHref}
          uncheckedReportsCounts={uncheckedReportsCounts}
        />

        <div className="mt-auto flex min-w-0 items-center gap-3 pt-6">
          <UserAvatar
            avatarUrl={currentUser.avatarUrl}
            avatarSeed={currentUser.nickname || currentUser.email}
            name={currentUser.displayName}
            size="menu"
          />
          <div className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--label-primary)]">
            {profileNickname}
          </div>
          <AdminSignOutButton />
        </div>

        <div
          aria-label="Изменить ширину меню"
          aria-orientation="vertical"
          className="absolute bottom-0 right-[-4px] top-0 z-10 w-2 cursor-col-resize touch-none"
          role="separator"
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
        />
      </aside>

      <div
        className="surface-elevated min-w-0"
        style={{
          minWidth: "max(calc(100vw - var(--admin-menu-column-width)), 1400px)",
        }}
      >
        <main
          className={cn(
            "mx-auto max-w-[1400px] px-6 pb-10 pt-10",
            contentClassName,
          )}
        >
          {sectionTitle ? (
            <div className="mb-6 flex min-h-11 items-center">
              <h1 className="type-h1 font-semibold text-[var(--label-primary)]">
                {sectionTitle}
              </h1>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
