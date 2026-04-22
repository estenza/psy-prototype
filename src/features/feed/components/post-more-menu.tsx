"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  BellIcon,
  BookmarkIcon,
  EyeOffIcon,
  FlagIcon,
  MoreHorizontalIcon,
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
  onAction: (actionId: PostMenuActionId, postId: Post["id"]) => void;
  post: Post;
};

type PostMenuRenderItem = {
  icon: ReactNode;
  id: PostMenuActionId;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
};

function resolveMenuIcon(actionId: PostMenuActionId, bookmarked: boolean) {
  if (actionId === "edit") {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d="M13.9824 2.56641C14.7647 1.78408 16.0331 1.7841 16.8154 2.56641L17.4336 3.18457C18.2158 3.96691 18.2158 5.23537 17.4336 6.01758L8.26172 15.1895C7.9577 15.4935 7.58648 15.7214 7.17773 15.8545L3.88965 16.9238C3.50568 17.0487 3.08416 16.9494 2.79785 16.6631C2.51153 16.3768 2.41229 15.9553 2.53711 15.5713L3.60645 12.2832C3.73942 11.8745 3.96742 11.5032 4.27148 11.1992L13.9824 2.56641ZM15.7549 3.62695C15.5588 3.43076 15.2402 3.43078 15.0449 3.62695L14.2285 4.44336L15.5566 5.77148L16.373 4.95508C16.5692 4.75987 16.5692 4.44115 16.373 4.24512L15.7549 3.62695ZM14.4951 6.83301L13.167 5.50488L5.33203 12.4707C5.18007 12.6227 5.06615 12.8083 4.99902 13.0146L4.2793 15.2285L6.49219 14.5088C6.69862 14.4416 6.88422 14.3276 7.03613 14.1758L14.4951 6.83301Z"
          fill="currentColor"
          fillOpacity="0.72"
        />
      </svg>
    );
  }

  if (actionId === "follow") return <BellIcon />;
  if (actionId === "save") return <BookmarkIcon filled={bookmarked} />;
  if (actionId === "report") return <FlagIcon />;
  return <EyeOffIcon />;
}

export function PostMoreMenu({ onAction, post }: PostMoreMenuProps) {
  const { user } = useAuthClient();
  const isOwnedByCurrentUser = isPostOwnedByUser(post, user);

  const actions = useMemo<PostMenuRenderItem[]>(() => {
    const menuActions = isOwnedByCurrentUser
      ? OWN_POST_MENU_ACTIONS
      : COMMUNITY_POST_MENU_ACTIONS;

    return menuActions.map((action) => ({
      icon: resolveMenuIcon(action.id, post.viewer.bookmarked),
      id: action.id,
      label: action.label,
      onSelect: () => onAction(action.id, post.id),
      tone: "tone" in action ? action.tone : undefined,
    }));
  }, [isOwnedByCurrentUser, onAction, post.id, post.viewer.bookmarked]);

  return (
    <div className="pointer-events-auto relative z-30 shrink-0">
      <Dropdown.Root>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Еще"
          className="interactive-tertiary button--blur-no-focus button--icon-only !inline-flex h-9 w-9 min-w-9 rounded-full px-0 text-[var(--label-primary)]"
        >
          <MoreHorizontalIcon aria-hidden />
        </Button>

        <Dropdown.Popover placement="bottom end" className="w-[260px]">
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
                variant={action.tone === "danger" ? "danger" : undefined}
                onAction={action.onSelect}
              >
                <div className="flex w-full items-center gap-3">
                  <span
                    className={
                      action.tone === "danger"
                        ? "inline-flex h-5 w-5 flex-none items-center justify-center text-danger"
                        : "inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]"
                    }
                  >
                    {action.icon}
                  </span>
                  <Label
                    className={
                      action.id === "save" && post.viewer.bookmarked
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
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  );
}
