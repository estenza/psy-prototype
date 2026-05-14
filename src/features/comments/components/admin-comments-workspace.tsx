"use client";

import Link from "next/link";
import { TextInput } from "@/components/ui/text-input";
import type {
  AdminCommentStatus,
  AdminCommentTimelineItem,
  AdminCommentsFilters,
} from "@/features/comments/types";
import { AdminCommentsTable } from "@/features/comments/components/admin-comments-table";

type AdminCommentsWorkspaceProps = {
  comments: AdminCommentTimelineItem[];
  filters: AdminCommentsFilters;
};

const STATUS_FILTERS: Array<{
  label: string;
  value: AdminCommentStatus | "all";
}> = [
  { label: "Все", value: "all" },
  { label: "Опубликованные", value: "published" },
  { label: "Удаленные", value: "deleted" },
  { label: "Скрытые", value: "hidden" },
  { label: "Ожидают", value: "pending" },
];

function getFilterHref(filters: AdminCommentsFilters, status: AdminCommentStatus | "all") {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (status !== "all") {
    searchParams.set("status", status);
  }

  const queryString = searchParams.toString();
  return queryString ? `/admin/comments?${queryString}` : "/admin/comments";
}

export function AdminCommentsWorkspace({
  comments,
  filters,
}: AdminCommentsWorkspaceProps) {
  return (
    <>
      <div className="mb-5 flex min-w-max flex-nowrap items-end justify-between gap-4">
        <form className="w-[360px] flex-none">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Поиск</span>
            <TextInput
              name="search"
              defaultValue={filters.search}
              placeholder="Автор, пост или текст комментария"
            />
          </label>
        </form>

        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = filters.status === filter.value;

            return (
              <Link
                key={filter.value}
                href={getFilterHref(filters, filter.value)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-8 items-center rounded-full px-4 text-[14px] leading-none no-underline transition-colors ${
                  isActive
                    ? "bg-[var(--label-primary)] font-semibold text-white"
                    : "bg-[var(--surface-secondary)] font-medium text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <AdminCommentsTable comments={comments} />
    </>
  );
}
