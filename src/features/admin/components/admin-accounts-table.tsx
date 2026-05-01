"use client";

import type { SortDescriptor } from "@heroui/react";

import { Chip, EmptyState, Modal, Popover, Table } from "@heroui/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloseIcon, QuestionCircleIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { AdminSpecialtyTags } from "@/features/admin/components/admin-specialty-tags";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";
import { AdminUserRowActions } from "@/features/admin/components/admin-user-row-actions";
import { ROLE_LABELS } from "@/features/auth/constants";
import type { AdminListedUser } from "@/features/admin/types";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const SPECIALIST_STATUS_LABELS: Record<string, string> = {
  none: "Без статуса",
  pending: "На проверке",
  rejected: "Отклонён",
  suspended: "Приостановлен",
  verified: "Подтверждён",
};

type AdminAccountsTableProps = {
  section: "specialists" | "users";
  users: AdminListedUser[];
};

const USERS_COLUMNS = [
  { key: "identity", label: "Пользователь", allowsSorting: true },
  { key: "accountType", label: "Тип аккаунта", allowsSorting: true },
  { key: "email", label: "Email", allowsSorting: true },
  { key: "status", label: "Статус", allowsSorting: true },
  { key: "createdAt", label: "Создан", allowsSorting: true },
  { key: "actions", label: "Действия", allowsSorting: false },
] as const;

const SPECIALISTS_COLUMNS = [
  { key: "identity", label: "Специалист", allowsSorting: true },
  { key: "accountType", label: "Тип аккаунта", allowsSorting: true },
  { key: "email", label: "Email", allowsSorting: true },
  { key: "specialties", label: "Психотерапевтические подходы", allowsSorting: true },
  { key: "status", label: "Статус", allowsSorting: true },
  { key: "createdAt", label: "Создан", allowsSorting: true },
  { key: "actions", label: "Действия", allowsSorting: false },
] as const;

type SortableColumnKey =
  | "accountType"
  | "createdAt"
  | "email"
  | "identity"
  | "specialties"
  | "status";

function BanReasonPopover({ reason }: { reason: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="Показать причину бана">
        <QuestionCircleIcon />
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Dialog>{reason}</Popover.Dialog>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
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
        d="M4 10.5L5.2 6.9C5.53 5.92 5.69 5.43 6.03 5.08C6.34 4.76 6.73 4.53 7.17 4.4C7.65 4.25 8.17 4.25 9.23 4.25H14.77C15.83 4.25 16.35 4.25 16.83 4.4C17.27 4.53 17.66 4.76 17.97 5.08C18.31 5.43 18.47 5.92 18.8 6.9L20 10.5M4 10.5V15C4 16.4 4 17.1 4.27 17.64C4.51 18.12 4.88 18.49 5.36 18.73C5.9 19 6.6 19 8 19H16C17.4 19 18.1 19 18.64 18.73C19.12 18.49 19.49 18.12 19.73 17.64C20 17.1 20 16.4 20 15V10.5M4 10.5H7.19C7.61 10.5 7.83 10.5 8.03 10.56C8.2 10.61 8.35 10.7 8.48 10.82C8.62 10.95 8.73 11.14 8.95 11.53L9.05 11.72C9.27 12.11 9.38 12.3 9.52 12.43C9.65 12.55 9.8 12.64 9.97 12.69C10.17 12.75 10.39 12.75 10.81 12.75H13.19C13.61 12.75 13.83 12.75 14.03 12.69C14.2 12.64 14.35 12.55 14.48 12.43C14.62 12.3 14.73 12.11 14.95 11.72L15.05 11.53C15.27 11.14 15.38 10.95 15.52 10.82C15.65 10.7 15.8 10.61 15.97 10.56C16.17 10.5 16.39 10.5 16.81 10.5H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`border-separator rounded-[16px] border p-4 ${className}`.trim()}>
      <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--label-tertiary)]">
        {label}
      </div>
      <div className="mt-3 text-[16px] text-[var(--label-primary)]">
        {value}
      </div>
    </div>
  );
}

function getStatusCopy(user: AdminListedUser) {
  if (user.isBanned) {
    return {
      color: "danger" as const,
      label: "Забанен",
      note: user.banReason ?? "Без причины",
    };
  }

  if (user.role === "specialist") {
    const specialistColorMap = {
      none: "default",
      pending: "accent",
      rejected: "danger",
      suspended: "warning",
      verified: "success",
    } as const;

    const statusKey = user.specialistStatus in specialistColorMap
      ? user.specialistStatus
      : "verified";

    return {
      color: specialistColorMap[statusKey],
      label: SPECIALIST_STATUS_LABELS[user.specialistStatus] ?? "Активен",
      note: null,
    };
  }

  return {
    color: "success" as const,
    label: "Активен",
    note: null,
  };
}

function getAccountTypeLabel(user: AdminListedUser) {
  if (user.isModerator) {
    return "Модератор";
  }

  return ROLE_LABELS[user.role];
}

function getPrimaryName(user: AdminListedUser, isUsersSection: boolean) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return isUsersSection ? user.displayName : (fullName || user.displayName);
}

function getSecondaryName(user: AdminListedUser, isUsersSection: boolean) {
  return isUsersSection && user.nickname ? `@${user.nickname}` : null;
}

function getSortableValue(
  user: AdminListedUser,
  column: SortableColumnKey,
  isUsersSection: boolean,
) {
  switch (column) {
    case "identity":
      return getPrimaryName(user, isUsersSection);
    case "accountType":
      return getAccountTypeLabel(user);
    case "email":
      return user.email;
    case "specialties":
      return user.specialties.join(", ");
    case "status":
      return getStatusCopy(user).label;
    case "createdAt":
      return new Date(user.createdAt).getTime();
    default:
      return "";
  }
}

function DetailsModal({
  onClose,
  user,
}: {
  onClose: () => void;
  user: AdminListedUser;
}) {
  const [view, setView] = useState<"details" | "editor">("details");
  const statusCopy = getStatusCopy(user);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const primaryName = user.role === "specialist"
    ? fullName || user.displayName
    : user.displayName;
  const secondaryName = user.role === "user" && user.nickname ? `@${user.nickname}` : null;
  const isEditorView = view === "editor";

  return (
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable
      onClick={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('[data-slot="modal-dialog"]')) return;
        onClose();
      }}
      className="fixed inset-0 z-[260]"
    >
      <Modal.Container
        scroll="outside"
        className="!p-4"
      >
        <Modal.Dialog
          aria-label={isEditorView ? "Редактировать аккаунт" : "Карточка аккаунта"}
          className="modal-surface relative w-full max-w-[720px] p-6"
        >
          <IconButton
            className="absolute right-3 top-3 text-[var(--label-primary)]"
            label="Закрыть"
            onClick={onClose}
            icon={<CloseIcon />}
          />

          {isEditorView ? (
            <AdminUserEditorModal
              embedded
              initialUser={user}
              isOpen
              onBack={() => setView("details")}
              onClose={() => setView("details")}
            />
          ) : (
            <>
              <div className="pr-10">
                <h2
                  id="admin-account-details-title"
                  className="font-helvetica text-[28px] font-bold leading-none"
                >
                  {user.role === "specialist" ? "Карточка специалиста" : "Карточка пользователя"}
                </h2>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  avatarSeed={user.nickname || user.id}
                  name={user.displayName}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="text-[22px] font-semibold text-[var(--label-primary)]">
                    {primaryName}
                  </div>
                  {secondaryName ? (
                    <div className="mt-1 text-[14px] text-[var(--label-secondary)]">{secondaryName}</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 min-[1280px]:grid-cols-2">
                {user.role === "user" ? (
                  <>
                    <InfoBlock label="Имя" value={user.displayName} />
                    <InfoBlock label="Имя аккаунта" value={secondaryName ?? "Не указано"} />
                  </>
                ) : (
                  <>
                    <InfoBlock label="Имя" value={user.firstName?.trim() || "Не указано"} />
                    <InfoBlock label="Фамилия" value={user.lastName?.trim() || "Не указано"} />
                  </>
                )}

                <InfoBlock label="Email" value={user.email} />
                <InfoBlock
                  label="Пароль"
                  value="Пароль не хранится в открытом виде и не может быть показан."
                />

                <div className="border-separator rounded-[16px] border p-4">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--label-tertiary)]">
                    Статус
                  </div>
                  <div className="mt-3 space-y-2">
                    <Chip color={statusCopy.color} variant="soft">{statusCopy.label}</Chip>
                    {statusCopy.note ? (
                      <p className="text-[14px] leading-6 text-[var(--label-secondary)]">
                        {statusCopy.note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <InfoBlock label="Создан" value={dateFormatter.format(new Date(user.createdAt))} />

                {user.role === "specialist" ? (
                  <div className="border-separator rounded-[16px] border p-4 min-[1280px]:col-span-2">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--label-tertiary)]">
                      Психотерапевтические подходы
                    </div>
                    <div className="mt-3">
                      <AdminSpecialtyTags specialties={user.specialties} />
                    </div>
                  </div>
                ) : null}

                <div className="border-separator rounded-[16px] border p-4 min-[1280px]:col-span-2">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--label-tertiary)]">
                    Описание
                  </div>
                  <div className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">
                    {user.profileDescription?.trim() || "Описание не заполнено"}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  className="!rounded-full !px-5"
                  onClick={() => setView("editor")}
                >
                  Редактировать
                </Button>
              </div>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function AdminAccountsTable({ section, users }: AdminAccountsTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminListedUser | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });
  const isUsersSection = section === "users";
  const emptyState = isUsersSection
    ? "Пока нет добавленных пользователей"
    : "Пока нет добавленных специалистов";
  const columns = isUsersSection ? USERS_COLUMNS : SPECIALISTS_COLUMNS;
  const sortedUsers = useMemo(() => {
    const column = sortDescriptor.column as SortableColumnKey | undefined;

    if (!column) {
      return users;
    }

    return [...users].sort((leftUser, rightUser) => {
      const leftValue = getSortableValue(leftUser, column, isUsersSection);
      const rightValue = getSortableValue(rightUser, column, isUsersSection);

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
  }, [isUsersSection, sortDescriptor, users]);

  return (
    <>
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label={isUsersSection ? "Список пользователей" : "Список специалистов"}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            onRowAction={(key) => {
              const user = users.find((item) => item.id === String(key));
              if (user) {
                setSelectedUser(user);
              }
            }}
          >
            <Table.Header>
              {columns.map((column) => (
                <Table.Column
                  key={column.key}
                  id={column.key}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.key === "identity"}
                >
                  {column.label}
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="py-16">
                  <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--label-secondary)]">
                    <EmptyTableStateIcon />
                    <div className="text-[16px] leading-7">{emptyState}</div>
                  </div>
                </EmptyState>
              )}
            >
              {sortedUsers.map((user) => {
                const statusCopy = getStatusCopy(user);
                const accountTypeLabel = getAccountTypeLabel(user);
                const primaryName = getPrimaryName(user, isUsersSection);
                const secondaryName = getSecondaryName(user, isUsersSection);

                return (
                  <Table.Row key={user.id} id={user.id}>
                    <Table.Cell>
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          avatarUrl={user.avatarUrl}
                          avatarSeed={user.nickname || user.id}
                          name={user.displayName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div>{primaryName}</div>
                          {secondaryName ? <div>{secondaryName}</div> : null}
                        </div>
                      </div>
                    </Table.Cell>

                    <Table.Cell>{accountTypeLabel}</Table.Cell>

                    <Table.Cell>{user.email}</Table.Cell>

                    {!isUsersSection ? (
                      <Table.Cell>
                        <AdminSpecialtyTags specialties={user.specialties} />
                      </Table.Cell>
                    ) : null}

                    <Table.Cell>
                      <div className="flex items-center gap-1.5">
                        <Chip color={statusCopy.color} variant="soft">{statusCopy.label}</Chip>
                        {statusCopy.note ? <BanReasonPopover reason={statusCopy.note} /> : null}
                      </div>
                    </Table.Cell>

                    <Table.Cell>{dateFormatter.format(new Date(user.createdAt))}</Table.Cell>

                    <Table.Cell>
                      <AdminUserRowActions user={user} />
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {selectedUser ? (
        <DetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      ) : null}
    </>
  );
}
