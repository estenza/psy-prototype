"use client";

import type { Selection, SortDescriptor } from "@heroui/react";
import {
  Checkbox,
  Chip,
  Drawer,
  Dropdown,
  EmptyState,
  Spinner,
  Table,
} from "@heroui/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import {
  ChevronDownIcon,
  CloseIcon,
  MoreHorizontalIcon,
} from "@/components/ui/icons";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { getPostBodyText } from "@/features/feed/lib/post-detail";
import { normalizePostDates } from "@/features/feed/lib/post-normalization";
import type { Post, PostMutationResponse } from "@/features/feed/types";
import {
  ADMIN_REPORT_ACTION_LABELS,
  ADMIN_REPORT_ACTIONS,
  REPORT_OBJECT_TYPE_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
} from "@/features/reports/lib/report-copy";
import type {
  AdminReportAction,
  AdminReportItem,
} from "@/features/reports/types";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeStyle: "short",
});

const statusChipLabelStyle = {
  fontSize: 12,
  lineHeight: "16px",
};

type AdminReportsTableProps = {
  activeReportIds: Set<string>;
  reports: AdminReportItem[];
  selectedKeys: Selection;
  onReportAction: (reportId: string, action: AdminReportAction) => void;
  onSelectionChange: (keys: Selection) => void;
};

type ReportsColumnKey =
  | "actions"
  | "author"
  | "createdAt"
  | "objectType"
  | "reason"
  | "reporter"
  | "status";

const REPORT_COLUMNS = [
  { key: "select", label: "", allowsSorting: false },
  { key: "createdAt", label: "Дата", allowsSorting: true },
  { key: "status", label: "Статус", allowsSorting: true },
  { key: "objectType", label: "Тип", allowsSorting: true },
  { key: "reason", label: "Причина", allowsSorting: true },
  { key: "reporter", label: "Отправил(-а) репорт", allowsSorting: true },
  { key: "author", label: "Автор контента", allowsSorting: true },
  { key: "actions", label: "Действия", allowsSorting: false },
] as const;

type ReportColumn = (typeof REPORT_COLUMNS)[number];

function getUserLine(user: AdminReportItem["reporter"]) {
  return `${user.name} ${user.handle}`;
}

function getDisplayReportStatus(status: AdminReportItem["status"]) {
  return status === "reviewed" ? "open" : status;
}

function getSortableValue(report: AdminReportItem, column: ReportsColumnKey) {
  switch (column) {
    case "author":
      return getUserLine(report.contentAuthor);
    case "createdAt":
      return new Date(report.createdAt).getTime();
    case "objectType":
      return REPORT_OBJECT_TYPE_LABELS[report.objectType];
    case "reason":
      return REPORT_REASON_LABELS[report.reason];
    case "reporter":
      return getUserLine(report.reporter);
    case "status":
      return REPORT_STATUS_LABELS[getDisplayReportStatus(report.status)];
    case "actions":
    default:
      return "";
  }
}

function EmptyTableStateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 text-[var(--label-tertiary)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 6.75C5 5.784 5.784 5 6.75 5h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 17.25 19H6.75A1.75 1.75 0 0 1 5 17.25V6.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9h8M8 12h8M8 15h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StatusPill({ status }: { status: AdminReportItem["status"] }) {
  const displayStatus = getDisplayReportStatus(status);
  const color = {
    action_taken: "success",
    dismissed: "success",
    open: "warning",
    reviewed: "warning",
  }[displayStatus] as "accent" | "default" | "success" | "warning";

  return (
    <Chip
      color={color}
      variant="soft"
      className={`admin-status-chip admin-status-chip--${displayStatus}`}
    >
      <Chip.Label style={statusChipLabelStyle}>
        {REPORT_STATUS_LABELS[displayStatus]}
      </Chip.Label>
    </Chip>
  );
}

function UserCell({ user }: { user: AdminReportItem["reporter"] }) {
  const profileHref = buildPublicProfilePathFromHandle(user.handle);

  return (
    <div className="min-w-0">
      {profileHref ? (
        <Link
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[var(--label-primary)] transition-colors hover:text-[var(--accent-primary)]"
          onClick={(event) => event.stopPropagation()}
        >
          {user.name}
        </Link>
      ) : (
        <div className="truncate text-[var(--label-primary)]">{user.name}</div>
      )}
      <div className="truncate text-[var(--label-tertiary)]">{user.handle}</div>
    </div>
  );
}

function SortColumnLabel({
  column,
  sortDescriptor,
}: {
  column: ReportColumn;
  sortDescriptor: SortDescriptor;
}) {
  const isActive = sortDescriptor.column === column.key;

  if (column.key === "select") {
    return null;
  }

  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="min-w-0 truncate">{column.label}</span>
      {column.allowsSorting ? (
        <span
          className={`flex h-3 w-3 flex-none items-center justify-center text-[var(--label-tertiary)] transition-opacity ${
            isActive ? "opacity-100" : "opacity-0"
          } ${
            isActive && sortDescriptor.direction === "ascending" ? "rotate-180" : ""
          }`.trim()}
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      ) : null}
    </span>
  );
}

function ReportSelectionCheckbox({
  ariaLabel,
  isIndeterminate = false,
  isSelected,
  onChange,
}: {
  ariaLabel: string;
  isIndeterminate?: boolean;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  return (
    <Checkbox
      slot={null}
      variant="secondary"
      aria-label={ariaLabel}
      isIndeterminate={isIndeterminate}
      isSelected={isSelected}
      onChange={onChange}
    >
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
    </Checkbox>
  );
}

function shouldIgnoreReportRowOpen(target: EventTarget | null) {
  return (
    target instanceof Element
    && Boolean(target.closest("a, button, input, textarea, select, [role='button'], [role='menuitem']"))
  );
}

function ReportContentPreviewDrawer({
  report,
  onOpenChange,
}: {
  report: AdminReportItem | null;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [loadedPreview, setLoadedPreview] = useState<{
    errorMessage: string | null;
    post: Post | null;
    postId: string;
    status: "ready" | "error";
  } | null>(null);
  const isOpen = Boolean(report);
  const requestedPostId = report?.postId ?? null;
  const status =
    !report
      ? "idle"
      : !requestedPostId
        ? "error"
        : loadedPreview?.postId === requestedPostId
          ? loadedPreview.status
          : "loading";
  const post =
    status === "ready" && loadedPreview?.postId === requestedPostId
      ? loadedPreview.post
      : null;
  const errorMessage =
    !requestedPostId && report
      ? "Не удалось определить пост для этой жалобы."
      : loadedPreview?.postId === requestedPostId
        ? loadedPreview.errorMessage
        : null;

  useEffect(() => {
    if (!requestedPostId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/posts/${requestedPostId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as (
          PostMutationResponse & { error?: string }
        ) | null;

        if (!response.ok || !payload?.post) {
          throw new Error(payload?.error ?? "Не удалось загрузить пост.");
        }

        setLoadedPreview({
          errorMessage: null,
          post: normalizePostDates(payload.post),
          postId: requestedPostId,
          status: "ready",
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoadedPreview({
          errorMessage:
            error instanceof Error ? error.message : "Не удалось загрузить пост.",
          post: null,
          postId: requestedPostId,
          status: "error",
        });
      });

    return () => {
      controller.abort();
    };
  }, [requestedPostId]);

  const detailedPost = post
    ? {
        ...post,
        content: {
          ...post.content,
          excerpt: getPostBodyText(post),
        },
      }
    : null;
  const highlightedCommentIds =
    report?.objectType === "comment" && report.commentId ? [report.commentId] : [];
  const previewKey = `${report?.id ?? "empty"}:${report?.commentId ?? "post"}`;
  const noopToggleBookmark = () => undefined;
  const noopToggleLike = () => undefined;
  const noopPostMenuAction = () => undefined;

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop variant="transparent" isDismissable>
        <Drawer.Content placement="right" className="z-[360]">
          <Drawer.Dialog
            aria-label="Контекст жалобы"
            className="admin-report-preview-drawer !w-[min(720px,calc(100vw-32px))] !max-w-[calc(100vw-32px)] p-0"
          >
            <Drawer.Header className="border-separator border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Drawer.Heading className="type-h3 font-bold text-[var(--label-primary)]">
                    Контекст жалобы
                  </Drawer.Heading>
                  {report ? (
                    <p className="mt-1 text-[14px] leading-5 text-[var(--label-secondary)]">
                      {REPORT_OBJECT_TYPE_LABELS[report.objectType]} · {REPORT_REASON_LABELS[report.reason]}
                    </p>
                  ) : null}
                </div>

                <Drawer.CloseTrigger
                  aria-label="Закрыть"
                  className={buttonClassName({
                    className: "flex-none text-[var(--label-primary)]",
                    isIconOnly: true,
                    size: "sm",
                    variant: "quaternary",
                  })}
                >
                  <CloseIcon />
                </Drawer.CloseTrigger>
              </div>
            </Drawer.Header>

            <Drawer.Body className="m-0 bg-[var(--background-primary)] p-0 text-[var(--label-primary)]">
              {status === "loading" ? (
                <div className="flex min-h-[280px] items-center justify-center text-[var(--label-secondary)]">
                  <Spinner size="sm" />
                </div>
              ) : null}

              {status === "error" ? (
                <div className="px-5 py-6">
                  <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
                    {errorMessage ?? "Не удалось загрузить контекст жалобы."}
                  </div>
                </div>
              ) : null}

              {detailedPost && report ? (
                <div key={previewKey} className="flex flex-col gap-3 px-5 py-5">
                  <section className="surface-card rounded-[24px] px-4 py-4">
                    <CardPostItem
                      post={detailedPost}
                      blockPointerEvents={false}
                      showActions={false}
                      showReadOnlyLikeCounter
                      showMenu
                      onToggleBookmark={noopToggleBookmark}
                      onToggleLike={noopToggleLike}
                      onPostMenuAction={noopPostMenuAction}
                    />
                  </section>

                  <section className="surface-card rounded-[24px] px-4 py-4">
                    <CommentsSection
                      key={previewKey}
                      pageId={`post:${detailedPost.id}`}
                      highlightedCommentIds={highlightedCommentIds}
                      readOnly
                      showReadOnlyActions
                      showReadOnlyMenu
                    />
                  </section>
                </div>
              ) : null}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

export function AdminReportsTable({
  activeReportIds,
  reports,
  selectedKeys,
  onReportAction,
  onSelectionChange,
}: AdminReportsTableProps) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });
  const [previewReport, setPreviewReport] = useState<AdminReportItem | null>(null);
  const sortedReports = useMemo(() => {
    const column = sortDescriptor.column as ReportsColumnKey | undefined;

    if (!column || column === "actions") {
      return reports;
    }

    return [...reports].sort((leftReport, rightReport) => {
      const leftValue = getSortableValue(leftReport, column);
      const rightValue = getSortableValue(rightReport, column);

      let comparison = 0;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), "ru", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDescriptor.direction === "descending" ? comparison * -1 : comparison;
    });
  }, [reports, sortDescriptor]);
  const selectedIdSet = useMemo(() => {
    if (selectedKeys === "all") {
      return new Set(reports.map((report) => report.id));
    }

    return new Set(Array.from(selectedKeys).map(String));
  }, [reports, selectedKeys]);
  const selectedVisibleCount = sortedReports.reduce(
    (count, report) => count + (selectedIdSet.has(report.id) ? 1 : 0),
    0,
  );
  const areAllVisibleReportsSelected =
    sortedReports.length > 0 && selectedVisibleCount === sortedReports.length;
  const areSomeVisibleReportsSelected =
    selectedVisibleCount > 0 && !areAllVisibleReportsSelected;

  function setReportSelected(reportId: string, isSelected: boolean) {
    const nextSelectedIds =
      selectedKeys === "all"
        ? new Set(reports.map((report) => report.id))
        : new Set(Array.from(selectedKeys).map(String));

    if (isSelected) {
      nextSelectedIds.add(reportId);
    } else {
      nextSelectedIds.delete(reportId);
    }

    onSelectionChange(nextSelectedIds);
  }

  function setVisibleReportsSelected(isSelected: boolean) {
    const nextSelectedIds =
      selectedKeys === "all"
        ? new Set(reports.map((report) => report.id))
        : new Set(Array.from(selectedKeys).map(String));

    sortedReports.forEach((report) => {
      if (isSelected) {
        nextSelectedIds.add(report.id);
      } else {
        nextSelectedIds.delete(report.id);
      }
    });

    onSelectionChange(nextSelectedIds);
  }

  return (
    <>
      <Table className="admin-reports-table">
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Список жалоб"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              {REPORT_COLUMNS.map((column) => (
                <Table.Column
                  key={column.key}
                  id={column.key}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.key === "createdAt"}
                >
                  {column.key === "select" ? (
                    <div
                      className="flex w-10 items-center justify-center"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <ReportSelectionCheckbox
                        ariaLabel="Выбрать все жалобы"
                        isIndeterminate={areSomeVisibleReportsSelected}
                        isSelected={areAllVisibleReportsSelected}
                        onChange={setVisibleReportsSelected}
                      />
                    </div>
                  ) : (
                    <SortColumnLabel
                      column={column}
                      sortDescriptor={sortDescriptor}
                    />
                  )}
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="py-16">
                  <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--label-secondary)]">
                    <EmptyTableStateIcon />
                    <div className="text-[16px] leading-7">Жалоб пока нет</div>
                  </div>
                </EmptyState>
              )}
            >
              {sortedReports.map((report) => {
                const isBusy = activeReportIds.has(report.id);

                return (
                  <Table.Row
                    key={report.id}
                    id={report.id}
                    className="cursor-pointer"
                    onAction={() => setPreviewReport(report)}
                    onPointerUp={(event) => {
                      if (event.button !== 0 || shouldIgnoreReportRowOpen(event.target)) {
                        return;
                      }

                      setPreviewReport(report);
                    }}
                  >
                    <Table.Cell>
                      <div
                        className="flex w-10 items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <ReportSelectionCheckbox
                          ariaLabel={`Выбрать жалобу ${REPORT_REASON_LABELS[report.reason]}`}
                          isSelected={selectedIdSet.has(report.id)}
                          onChange={(isSelected) => setReportSelected(report.id, isSelected)}
                        />
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <span className="whitespace-nowrap leading-5">
                        {timeFormatter.format(new Date(report.createdAt))},{" "}
                        {dateFormatter.format(new Date(report.createdAt))}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <StatusPill status={report.status} />
                    </Table.Cell>

                    <Table.Cell>
                      {REPORT_OBJECT_TYPE_LABELS[report.objectType]}
                    </Table.Cell>

                    <Table.Cell>
                      {REPORT_REASON_LABELS[report.reason]}
                    </Table.Cell>

                    <Table.Cell>
                      <UserCell user={report.reporter} />
                    </Table.Cell>

                    <Table.Cell>
                      <UserCell user={report.contentAuthor} />
                    </Table.Cell>

                    <Table.Cell>
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Dropdown.Root>
                          <Dropdown.Trigger
                            aria-label="Открыть меню действий"
                            isDisabled={isBusy}
                            className={buttonClassName({
                              className: "cursor-pointer text-[var(--label-primary)] disabled:cursor-not-allowed disabled:opacity-50",
                              isIconOnly: true,
                              size: "sm",
                              variant: "quaternary",
                            })}
                          >
                            <MoreHorizontalIcon />
                          </Dropdown.Trigger>

                          <DropdownPopover placement="bottom end" className="min-w-[220px]">
                            <Dropdown.Menu
                              aria-label="Действия с жалобой"
                              selectionMode="none"
                              className="dropdown-menu-default"
                              onAction={(key) => {
                                onReportAction(report.id, String(key) as AdminReportAction);
                              }}
                            >
                              {ADMIN_REPORT_ACTIONS.map((action) => (
                                <Dropdown.Item
                                  key={action}
                                  id={action}
                                  textValue={ADMIN_REPORT_ACTION_LABELS[action]}
                                >
                                  {ADMIN_REPORT_ACTION_LABELS[action]}
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </DropdownPopover>
                        </Dropdown.Root>
                        {isBusy ? (
                          <span className="text-[14px] text-[var(--label-tertiary)]">
                            Обработка...
                          </span>
                        ) : null}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <ReportContentPreviewDrawer
        report={previewReport}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) {
            setPreviewReport(null);
          }
        }}
      />
    </>
  );
}
