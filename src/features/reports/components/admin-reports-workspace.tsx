"use client";

import { Dropdown } from "@heroui/react";
import type { Selection } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "@/components/feedback/toast";
import { buttonClassName } from "@/components/ui/button-styles";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { ChevronDownIcon } from "@/components/ui/icons";
import { TextInput } from "@/components/ui/text-input";
import { AdminReportsTable } from "@/features/reports/components/admin-reports-table";
import {
  ADMIN_REPORT_ACTION_LABELS,
  ADMIN_REPORT_ACTIONS,
} from "@/features/reports/lib/report-copy";
import type {
  AdminReportAction,
  AdminReportItem,
  AdminReportsFilters,
} from "@/features/reports/types";

type AdminReportsWorkspaceProps = {
  filters: AdminReportsFilters;
  reports: AdminReportItem[];
};

function BatchReportActions({
  disabled,
  onAction,
}: {
  disabled: boolean;
  onAction: (action: AdminReportAction) => void;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        isDisabled={disabled}
        className={buttonClassName({
          className: "inline-flex flex-row items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50",
          size: "sm",
          variant: "primary",
        })}
      >
        <span>Действия</span>
        <ChevronDownIcon />
      </Dropdown.Trigger>

      <DropdownPopover placement="bottom end" className="min-w-[220px]">
        <Dropdown.Menu
          aria-label="Групповые действия с жалобами"
          selectionMode="none"
          className="dropdown-menu-default"
          onAction={(key) => {
            if (disabled) {
              return;
            }

            onAction(String(key) as AdminReportAction);
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
  );
}

export function AdminReportsWorkspace({
  filters,
  reports,
}: AdminReportsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [activeReportIds, setActiveReportIds] = useState<Set<string>>(new Set());
  const selectedReportIds = useMemo(() => {
    if (selectedKeys === "all") {
      return reports.map((report) => report.id);
    }

    return Array.from(selectedKeys).map(String);
  }, [reports, selectedKeys]);
  const selectedReportIdSet = useMemo(
    () => new Set(selectedReportIds),
    [selectedReportIds],
  );
  const isBatchActionDisabled = isPending || activeReportIds.size > 0;

  async function applyActionToReport(reportId: string, action: AdminReportAction) {
    const response = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось применить действие.");
    }
  }

  async function applyBatchAction(action: AdminReportAction) {
    if (selectedReportIds.length === 0) {
      toast.warning("Необходимо выбрать репорт");
      return;
    }

    setActiveReportIds(selectedReportIdSet);

    try {
      const results = await Promise.allSettled(
        selectedReportIds.map((reportId) => applyActionToReport(reportId, action)),
      );
      const failedCount = results.filter((result) => result.status === "rejected").length;

      if (failedCount > 0) {
        throw new Error(
          failedCount === selectedReportIds.length
            ? "Не удалось применить действие."
            : `Не удалось обработать ${failedCount} из ${selectedReportIds.length}.`,
        );
      }

      toast.success("Действие применено");
      setSelectedKeys(new Set());
      startTransition(() => router.refresh());
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : "Не удалось применить действие.",
      );
    } finally {
      setActiveReportIds(new Set());
    }
  }

  async function applySingleAction(reportId: string, action: AdminReportAction) {
    if (isPending || activeReportIds.size > 0) {
      return;
    }

    setActiveReportIds(new Set([reportId]));

    try {
      await applyActionToReport(reportId, action);
      toast.success("Действие применено");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : "Не удалось применить действие.",
      );
    } finally {
      setActiveReportIds(new Set());
    }
  }

  return (
    <>
      <div className="mb-6 flex min-w-max flex-nowrap items-end justify-between gap-3">
        <form className="w-[320px] flex-none">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Поиск</span>
            <TextInput
              name="search"
              defaultValue={filters.search}
              placeholder="Автор, репортёр или текст"
            />
          </label>
        </form>

        <BatchReportActions
          disabled={isBatchActionDisabled}
          onAction={(action) => void applyBatchAction(action)}
        />
      </div>

      <AdminReportsTable
        activeReportIds={activeReportIds}
        reports={reports}
        selectedKeys={selectedKeys}
        onReportAction={(reportId, action) => void applySingleAction(reportId, action)}
        onSelectionChange={setSelectedKeys}
      />
    </>
  );
}
