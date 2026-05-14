"use client";

import { Tabs } from "@heroui/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buttonClassName } from "@/components/ui/button-styles";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { ArrowTurnRightIcon } from "@/components/ui/icons";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentItem } from "@/features/comments/components/comment-item";
import type { ProfileCommentItem } from "@/features/comments/types";
import { ProfilePostsSection } from "@/features/feed/components/profile-posts-section";
import { buildPostHref } from "@/features/feed/lib/post-navigation";
import { buildCreateTopicHref } from "@/features/topic-creation/lib/create-topic-navigation";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

type ProfileActivityTabKey = "posts" | "replies" | "favorites";

type ProfileActivityTabsProps = {
  displayName: string;
  favoritePosts: Post[];
  posts: Post[];
  replies: ProfileCommentItem[];
  viewerIsOwner: boolean;
};

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <ContentPlaceholder title={title} description={description} />
  );
}

function mapProfileReplyToCommentNode(reply: ProfileCommentItem): CommentNode {
  return {
    id: reply.id,
    parentId: null,
    rootId: reply.id,
    depth: 0,
    status: "published",
    author: reply.author,
    createdAt: reply.createdAt,
    deletedAt: null,
    deletedByModerator: false,
    deletedRelativeDate: null,
    deletedCompactRelativeDate: null,
    relativeDate: reply.relativeDate,
    compactRelativeDate: reply.compactRelativeDate,
    bodyHtml: reply.bodyHtml,
    bodyText: reply.bodyText,
    upvotes: reply.upvotes,
    downvotes: 0,
    isEdited: false,
    isFeatured: false,
    isLoved: false,
    userVote: reply.userVote,
    viewerOwnsComment: false,
    replyCount: 0,
    hasReplyContext: false,
    replies: [],
    capabilities: {
      canReply: false,
      canVote: true,
      canReport: false,
      canEdit: false,
      canDelete: false,
    },
  };
}

const readOnlyViewer: CommentsViewer = {
  displayName: "",
  handle: "",
  initials: "",
  avatarUrl: null,
  hyvorUserHtid: null,
  kind: "anonymous",
  isAuthenticated: false,
};

function RepliesPanel({
  displayName,
  replies,
  viewerIsOwner,
}: {
  displayName: string;
  replies: ProfileCommentItem[];
  viewerIsOwner: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, openAuthModal, runIfAuthorized } = useAuthRequiredAction();
  const [items, setItems] = useState(replies);
  const currentProfilePath = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    setItems(replies);
  }, [replies]);

  async function handleVote(commentId: string, type: "up" | "down" | null) {
    await runIfAuthorized(async () => {
      const currentReply = items.find((item) => item.id === commentId);

      if (!currentReply) {
        return;
      }

      const nextVote = type === "up" ? "up" : null;
      const previousVote = currentReply.userVote;
      const nextUpvotes = Math.max(
        0,
        currentReply.upvotes + (previousVote === "up" ? -1 : 0) + (nextVote === "up" ? 1 : 0),
      );

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === commentId
            ? {
                ...item,
                upvotes: nextUpvotes,
                userVote: nextVote,
              }
            : item,
        ),
      );

      try {
        const response = await fetch(`/api/comments/${commentId}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: nextVote,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось оценить комментарий.");
        }
      } catch {
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === commentId
              ? {
                  ...item,
                  upvotes: currentReply.upvotes,
                  userVote: previousVote,
                }
              : item,
          ),
        );
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={viewerIsOwner
          ? "У вас пока нет комментариев"
          : `${displayName} пока не оставил(а) комментариев`}
        description={viewerIsOwner
          ? "Когда вы начнёте комментировать посты, ваши комментарии появятся здесь."
          : "Когда здесь появятся комментарии, они будут показаны в отдельной вкладке профиля."}
      />
    );
  }

  return (
    <div className="space-y-5">
      {items.map((reply) => {
        const replyHref = buildPostHref(reply.postId, currentProfilePath, reply.id);

        return (
          <div key={reply.id} className="flex min-w-0 flex-col gap-2">
            <Link
              href={replyHref}
              className="mx-4 inline-flex max-w-full items-center gap-1 rounded-none p-0 text-[14px] leading-5 font-medium text-[var(--label-tertiary)] no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[2px] underline-offset-4 min-[480px]:mx-5 min-[480px]:mx-6"
            >
              <span className="flex-none">
                <ArrowTurnRightIcon />
              </span>
              <span className="min-w-0 truncate">{reply.postTitle}</span>
            </Link>
            <CommentItem
              comment={mapProfileReplyToCommentNode(reply)}
              viewer={readOnlyViewer}
              canPostReply={false}
              isViewerAuthenticated={isAuthenticated}
              onRequireAuth={openAuthModal}
              submittingTarget={null}
              onDeleteComment={async () => {}}
              onEditComment={async () => false}
              onSubmitReply={async () => false}
              onVote={handleVote}
              onBlock={() => {}}
              onReport={() => {}}
              flat
              showAvatar={false}
              showMenu={false}
              readOnlyLike
              showReplyAction={false}
              bodySurface
              onOpen={() => {
                router.push(replyHref);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ProfileActivityTabs({
  displayName,
  favoritePosts,
  posts,
  replies,
  viewerIsOwner,
}: ProfileActivityTabsProps) {
  const [selectedKey, setSelectedKey] = useState<ProfileActivityTabKey>("posts");
  const activePanelContentRef = useRef<HTMLDivElement | null>(null);
  const [panelMinHeight, setPanelMinHeight] = useState(0);
  const favoritePostsCount = favoritePosts.length;
  const postsCount = posts.length;
  const repliesCount = replies.length;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentProfilePath = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const createPostHref = buildCreateTopicHref(currentProfilePath);
  const getCounterClassName = (tabKey: ProfileActivityTabKey) =>
    tabKey === selectedKey
      ? "text-[var(--label-tertiary)]"
      : "text-[var(--label-quaternary)]";
  const panelMinHeightStyle = panelMinHeight > 0 ? { minHeight: panelMinHeight } : undefined;

  function rememberActivePanelHeight() {
    const activePanelHeight = activePanelContentRef.current?.offsetHeight ?? 0;

    if (activePanelHeight > 0) {
      setPanelMinHeight((currentHeight) => Math.max(currentHeight, activePanelHeight));
    }
  }

  useLayoutEffect(() => {
    const activePanelElement = activePanelContentRef.current;

    if (!activePanelElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = entry?.contentRect.height ?? 0;

      if (nextHeight > 0) {
        setPanelMinHeight((currentHeight) => Math.max(currentHeight, nextHeight));
      }
    });

    observer.observe(activePanelElement);

    return () => observer.disconnect();
  }, [selectedKey]);

  return (
    <Tabs
      variant="secondary"
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        rememberActivePanelHeight();
        setSelectedKey(String(key) as ProfileActivityTabKey);
      }}
      className="w-full gap-0"
    >
      <Tabs.ListContainer className="relative px-4 pt-4 after:absolute after:bottom-0 after:left-4 after:right-4 after:border-b after:border-border">
        <Tabs.List aria-label="Разделы активности профиля" className="relative z-10 !w-fit !border-b-0 justify-start gap-0">
          <Tabs.Tab key="posts" id="posts" className="h-12 !w-auto flex-none !px-5 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Посты</span>
              <span className={getCounterClassName("posts")}>{postsCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="replies" id="replies" className="h-12 !w-auto flex-none !px-5 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Комментарии</span>
              <span className={getCounterClassName("replies")}>{repliesCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="favorites" id="favorites" className="h-12 !w-auto flex-none !px-5 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Избранное</span>
              <span className={getCounterClassName("favorites")}>{favoritePostsCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="!px-0 !pb-0 pt-0" key="posts" id="posts" style={panelMinHeightStyle}>
        <div ref={selectedKey === "posts" ? activePanelContentRef : undefined}>
          <ProfilePostsSection
            initialPosts={posts}
            emptyTitle={viewerIsOwner
              ? "Тут будут ваши посты"
              : `${displayName} пока не создал(а) постов`}
            emptyDescription={viewerIsOwner
              ? "Напишите ваш первый пост"
              : "Когда здесь появятся публикации, они будут показаны в таком же формате, как на главной странице."}
            emptyAction={viewerIsOwner ? (
              <Link
                href={createPostHref}
                className={buttonClassName({
                  className: "type-body-md-medium h-11 px-6",
                  variant: "primary",
                })}
              >
                Написать
              </Link>
            ) : null}
          />
        </div>
      </Tabs.Panel>

      <Tabs.Panel className="pt-8 pb-24" key="replies" id="replies" style={panelMinHeightStyle}>
        <div ref={selectedKey === "replies" ? activePanelContentRef : undefined}>
          <RepliesPanel
            displayName={displayName}
            replies={replies}
            viewerIsOwner={viewerIsOwner}
          />
        </div>
      </Tabs.Panel>

      <Tabs.Panel className="!px-0 !pb-0 pt-0" key="favorites" id="favorites" style={panelMinHeightStyle}>
        <div ref={selectedKey === "favorites" ? activePanelContentRef : undefined}>
          <ProfilePostsSection
            initialPosts={favoritePosts}
            emptyTitle={viewerIsOwner
              ? "Тут пока пусто"
              : `${displayName} пока ничего не добавил(а) в избранное`}
            emptyDescription={viewerIsOwner
              ? "Добавляйте посты в избранное, чтобы сохранять их у себя в профиле"
              : "Когда здесь появятся посты, их можно будет открыть из профиля."}
            removeFromFeedWhenProfileFavoriteRemoved={viewerIsOwner}
          />
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}
