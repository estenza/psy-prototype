"use client";

import { useRouter } from "next/navigation";
import { Dropdown, Label, ToggleButton, cn, toast } from "@heroui/react";
import { useState } from "react";
import {
  BookmarkIcon,
  ChatIcon,
  EyeIcon,
  LinkActionIcon,
  PostHeartIcon,
  ShareIcon,
  TelegramIcon,
} from "@/components/ui/icons";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import type { Post } from "@/features/feed/types";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

type PostActionsProps = {
  post: Post;
  className: string;
  onToggleBookmark: (postId: Post["id"]) => void;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  postHref?: string;
};

export function PostActions({
  post,
  className,
  onToggleBookmark,
  onToggleLike,
  postHref,
}: PostActionsProps) {
  const router = useRouter();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const resolvedPostHref = postHref ?? `/posts/${post.id}`;
  const likedActionClassName =
    "bg-[var(--color-danger-soft)] text-[var(--danger)] hover:bg-[var(--color-danger-soft-hover)] data-[hovered=true]:bg-[var(--color-danger-soft-hover)] active:bg-[var(--color-danger-soft-hover)] data-[pressed=true]:bg-[var(--color-danger-soft-hover)] active:text-[var(--danger)] data-[pressed=true]:text-[var(--danger)]";
  const tertiaryActionClassName =
    "post-action-button interactive-action-soft type-body-md inline-flex h-9 items-center justify-center rounded-full px-3 font-normal transition-colors active:text-[var(--label-secondary)] data-[pressed=true]:text-[var(--label-secondary)]";
  const tertiaryIconOnlyActionClassName = cn(
    tertiaryActionClassName,
    "button--icon-only w-9 px-0",
  );
  const bookmarkIconOnlyActionClassName =
    "post-action-button interactive-action-soft type-body-md inline-flex h-9 items-center justify-center rounded-full font-normal transition-colors button--icon-only w-9 px-0 text-[var(--label-secondary)]";

  function getPostUrl() {
    return new URL(`/posts/${post.id}`, window.location.origin).toString();
  }

  async function handleCopyLink() {
    const copied = await copyTextToClipboard(getPostUrl());

    if (copied) {
      toast.success("Ссылка на пост скопирована.");
      return;
    }

    toast.danger("Не удалось скопировать ссылку.");
  }

  function handleTelegramShare() {
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", getPostUrl());
    telegramShareUrl.searchParams.set("text", post.content.title);

    const openedWindow = window.open(
      telegramShareUrl.toString(),
      "_blank",
      "noopener,noreferrer",
    );

    if (!openedWindow) {
      window.location.href = telegramShareUrl.toString();
    }
  }

  return (
    <div
      className={cn(className, "pointer-events-none relative z-20 w-full gap-2")}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <HoverTooltip label={post.viewer.liked ? "Больше не нравится" : "Нравится"}>
        <ToggleButton
          aria-label={post.viewer.liked ? "Больше не нравится" : "Нравится"}
          isSelected={post.viewer.liked}
          onChange={() => onToggleLike(post.id, !post.viewer.liked)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            tertiaryActionClassName,
            "pointer-events-auto",
            post.stats.likes > 0 ? "gap-2 align-middle" : "button--icon-only w-9 px-0",
            post.viewer.liked
              ? `post-action-liked ${likedActionClassName}`
              : "post-action-like-idle",
          )}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <PostHeartIcon filled={post.viewer.liked} />
          </span>
          {post.stats.likes > 0 ? (
            <span className="flex items-center leading-5">{post.stats.likes}</span>
          ) : null}
        </ToggleButton>
      </HoverTooltip>

      <HoverTooltip label="Ответить">
        <button
          type="button"
          aria-label="Ответить"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            router.push(resolvedPostHref);
          }}
          className={cn(
            tertiaryActionClassName,
            "pointer-events-auto",
            post.stats.comments > 0 ? "gap-2 align-middle" : "button--icon-only w-9 px-0",
          )}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <ChatIcon />
          </span>
          {post.stats.comments > 0 ? (
            <span className="flex items-center leading-5">{post.stats.comments}</span>
          ) : null}
        </button>
      </HoverTooltip>

      <Dropdown.Root isOpen={isShareMenuOpen} onOpenChange={setIsShareMenuOpen}>
        <HoverTooltip
          label="Поделиться"
          isDisabled={isShareMenuOpen}
          triggerClassName="inline-flex"
        >
          <Dropdown.Trigger
            aria-label="Поделиться"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className={cn(tertiaryIconOnlyActionClassName, "pointer-events-auto")}
          >
            <span className="flex h-5 w-5 flex-none items-center justify-center">
              <ShareIcon />
            </span>
          </Dropdown.Trigger>
        </HoverTooltip>

        <DropdownPopover placement="bottom start" className="min-w-[230px]">
          <Dropdown.Menu
            aria-label="Поделиться постом"
            selectionMode="none"
            className="dropdown-menu-default"
            onAction={(key) => {
              setIsShareMenuOpen(false);

              if (key === "copy-link") {
                void handleCopyLink();
                return;
              }

              if (key === "telegram") {
                handleTelegramShare();
              }
            }}
          >
            <Dropdown.Item id="copy-link" textValue="Копировать ссылку">
              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                  <LinkActionIcon />
                </span>
                <Label className="min-w-0 flex-1 truncate">
                  Копировать ссылку
                </Label>
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="telegram" textValue="Поделиться в Telegram">
              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                  <TelegramIcon />
                </span>
                <Label className="min-w-0 flex-1 truncate">
                  Поделиться в Telegram
                </Label>
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </DropdownPopover>
      </Dropdown.Root>

      <div
        aria-label={`Просмотров: ${post.stats.views}`}
        className="ml-auto mr-2 inline-flex h-9 items-center gap-1.5 text-[var(--label-quaternary)]"
      >
        <span className="flex h-5 w-5 flex-none items-center justify-center">
          <EyeIcon />
        </span>
        <span className="type-body-md flex items-center leading-5">
          {post.stats.views}
        </span>
      </div>

      <HoverTooltip
        label={post.viewer.bookmarked ? "Убрать из закладок" : "Добавить в закладки"}
      >
        <ToggleButton
          aria-label={post.viewer.bookmarked ? "Убрать из закладок" : "Добавить в закладки"}
          isSelected={post.viewer.bookmarked}
          onChange={() => onToggleBookmark(post.id)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            bookmarkIconOnlyActionClassName,
            "pointer-events-auto",
            post.viewer.bookmarked ? "interactive-accent-bookmark" : "",
          )}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <BookmarkIcon filled={post.viewer.bookmarked} />
          </span>
        </ToggleButton>
      </HoverTooltip>
    </div>
  );
}
