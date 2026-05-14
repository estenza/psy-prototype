"use client";

import Link from "next/link";
import { TextInput } from "@/components/ui/text-input";
import { AdminPostsTable } from "@/features/feed/components/admin-posts-table";
import type {
  AdminPostStatus,
  AdminPostTimelineItem,
  AdminPostsFilters,
} from "@/features/feed/types";

type AdminPostsWorkspaceProps = {
  filters: AdminPostsFilters;
  posts: AdminPostTimelineItem[];
};

const STATUS_FILTERS: Array<{
  label: string;
  value: AdminPostStatus | "all";
}> = [
  { label: "Все", value: "all" },
  { label: "Опубликованные", value: "published" },
  { label: "Удаленные", value: "deleted" },
  { label: "Скрытые", value: "hidden" },
];

function getFilterHref(filters: AdminPostsFilters, status: AdminPostStatus | "all") {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (status !== "all") {
    searchParams.set("status", status);
  }

  const queryString = searchParams.toString();
  return queryString ? `/admin/posts?${queryString}` : "/admin/posts";
}

export function AdminPostsWorkspace({
  filters,
  posts,
}: AdminPostsWorkspaceProps) {
  return (
    <>
      <div className="mb-5 flex min-w-max flex-nowrap items-end justify-between gap-4">
        <form className="w-[360px] flex-none">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Поиск</span>
            <TextInput
              name="search"
              defaultValue={filters.search}
              placeholder="Автор, тема или текст поста"
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

      <AdminPostsTable posts={posts} />
    </>
  );
}
