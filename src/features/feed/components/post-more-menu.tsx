"use client";

import { Dropdown, Label } from "@heroui/react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import {
  ArrowTurnRightIcon,
  BellIcon,
  DeleteOutlineIcon,
  EditOutlineIcon,
  EyeOffIcon,
  FlagIcon,
  IgnoreAuthorIcon,
  PersonPlusIcon,
} from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import {
  COMMUNITY_POST_MENU_ACTIONS,
  OWN_POST_MENU_ACTIONS,
  type PostMenuActionId,
} from "@/features/feed/constants/post-menu";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type { Post } from "@/features/feed/types";

type PostMoreMenuProps = {
  onAction: (actionId: PostMenuActionId, postId: Post["id"]) => Promise<void> | void;
  post: Post;
};

type PostMenuRenderItem = {
  icon: ReactNode;
  id: PostMenuActionId;
  label: string;
  onSelect: () => void;
};

const MIN_CONFIRM_LOADING_MS = 1000;

function resolveMenuIcon(actionId: PostMenuActionId) {
  if (actionId === "edit") {
    return <EditOutlineIcon />;
  }

  if (actionId === "delete") {
    return <DeleteOutlineIcon />;
  }

  if (actionId === "follow-author") return <PersonPlusIcon />;
  if (actionId === "follow") return <BellIcon />;
  if (actionId === "profile-favorite") return <ArrowTurnRightIcon />;
  if (actionId === "hide") return <IgnoreAuthorIcon />;
  if (actionId === "report") return <FlagIcon />;
  return <EyeOffIcon />;
}

export function PostMoreMenu({ onAction, post }: PostMoreMenuProps) {
  const { user } = useAuthClient();
  const isOwnedByCurrentUser = isPostOwnedByUser(post, user);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const actions = useMemo<PostMenuRenderItem[]>(() => {
    const menuActions = isOwnedByCurrentUser
      ? OWN_POST_MENU_ACTIONS
      : COMMUNITY_POST_MENU_ACTIONS;

    const authorHandle = post.author.handle.startsWith("@")
      ? post.author.handle
      : `@${post.author.handle}`;

    return menuActions.map((action) => ({
      icon: resolveMenuIcon(action.id),
      id: action.id,
      label:
        action.id === "follow-author"
          ? `Начать читать ${authorHandle}`
          : action.id === "profile-favorite" && post.viewer.profileFavorite
            ? "Убрать из Избранного"
          : action.id === "hide"
            ? `Игнорировать ${authorHandle}`
            : action.label,
      onSelect: () => {
        if (action.id === "delete") {
          setDeleteErrorMessage(null);
          setIsDeleteDialogOpen(true);
          return;
        }

        void onAction(action.id, post.id);
      },
    }));
  }, [isOwnedByCurrentUser, onAction, post]);

  async function handleDeleteConfirm() {
    setIsDeleteSubmitting(true);
    setDeleteErrorMessage(null);

    try {
      await Promise.all([
        onAction("delete", post.id),
        new Promise((resolve) => {
          window.setTimeout(resolve, MIN_CONFIRM_LOADING_MS);
        }),
      ]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось удалить пост.",
      );
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  return (
    <>
      <div className="pointer-events-auto relative z-30 shrink-0">
        <Dropdown.Root isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <MoreMenuButton ariaLabel="Еще" isTooltipDisabled={isMenuOpen} />

          <DropdownPopover placement="bottom end" className="w-[260px]">
            <Dropdown.Menu
              aria-label="Меню публикации"
              selectionMode="none"
              className="dropdown-menu-default"
            >
              {actions.map((action) => (
                <Dropdown.Item
                  key={action.id}
                  id={action.id}
                  textValue={action.label}
                  onAction={action.onSelect}
                >
                  <div className="flex w-full items-center gap-3">
                    <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                      {action.icon}
                    </span>
                    <Label
                      className={
                        action.id === "profile-favorite" && post.viewer.profileFavorite
                          ? "min-w-0 flex-1 truncate text-[var(--label-primary)]"
                          : "min-w-0 flex-1 truncate"
                      }
                    >
                      {action.label}
                    </Label>
                  </div>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </DropdownPopover>
        </Dropdown.Root>
      </div>

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Удалить пост?"
          description="Восстановить уже не получится"
          actionLabel="Удалить"
          errorMessage={deleteErrorMessage}
          isLoading={isDeleteSubmitting}
          onClose={() => {
            if (!isDeleteSubmitting) {
              setIsDeleteDialogOpen(false);
              setDeleteErrorMessage(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteConfirm();
          }}
        />
      ) : null}
    </>
  );
}
