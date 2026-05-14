"use client";

import { useRouter } from "next/navigation";
import { ToggleButton, cn } from "@heroui/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import {
  BookmarkIcon,
  ChatIcon,
  EyeIcon,
  LinkActionIcon,
  PostHeartIcon,
  ShareIcon,
  TelegramIcon,
} from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { ResponsiveActionMenu } from "@/components/ui/responsive-action-menu";
import { toast } from "@/components/feedback/toast";
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
  const tertiaryAccentActionClassName = buttonClassName({
    className: "post-action-button type-body-md inline-flex font-medium",
    size: "s",
    variant: "tertiary-accent",
  });
  const tertiaryAccentIconOnlyActionClassName = buttonClassName({
    className: "post-action-button type-body-md inline-flex font-medium",
    isIconOnly: true,
    size: "s",
    variant: "tertiary-accent",
  });

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
            post.stats.likes > 0
              ? tertiaryAccentActionClassName
              : tertiaryAccentIconOnlyActionClassName,
            "pointer-events-auto",
            post.stats.likes > 0 ? "gap-2 align-middle" : "",
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

      <HoverTooltip label="Комментировать">
        <button
          type="button"
          aria-label="Комментировать"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            router.push(resolvedPostHref);
          }}
          className={cn(
            post.stats.comments > 0
              ? tertiaryAccentActionClassName
              : tertiaryAccentIconOnlyActionClassName,
            "pointer-events-auto",
            post.stats.comments > 0 ? "gap-2 align-middle" : "",
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

      <ResponsiveActionMenu
        ariaLabel="Поделиться постом"
        isOpen={isShareMenuOpen}
        onOpenChange={setIsShareMenuOpen}
        popoverPlacement="bottom start"
        popoverClassName="min-w-[230px]"
        items={[
          {
            id: "copy-link",
            label: "Копировать ссылку",
            icon: <LinkActionIcon />,
            onSelect: handleCopyLink,
          },
          {
            id: "telegram",
            label: "Поделиться в Telegram",
            icon: <TelegramIcon />,
            onSelect: handleTelegramShare,
          },
        ]}
        renderTrigger={({ isOpen, isMobile, open }) => (
          <HoverTooltip
            label="Поделиться"
            isDisabled={isOpen}
            triggerClassName="inline-flex"
          >
            <Button
              isIconOnly
              variant="tertiary-accent"
              size="s"
              aria-label="Поделиться"
              aria-expanded={isOpen}
              aria-haspopup={isMobile ? "dialog" : "menu"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (isMobile) {
                  open();
                }
              }}
              className={cn(tertiaryAccentIconOnlyActionClassName, "pointer-events-auto")}
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center">
                <ShareIcon />
              </span>
            </Button>
          </HoverTooltip>
        )}
      />

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
            tertiaryAccentIconOnlyActionClassName,
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
