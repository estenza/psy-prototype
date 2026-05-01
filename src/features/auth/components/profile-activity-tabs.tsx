"use client";

import { Tabs } from "@heroui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { ArrowTurnRightIcon } from "@/components/ui/icons";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentItem } from "@/features/comments/components/comment-item";
import type { ProfileCommentItem } from "@/features/comments/types";
import { ProfilePostsSection } from "@/features/feed/components/profile-posts-section";
import { buildPostHref } from "@/features/feed/lib/post-navigation";
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
          throw new Error(payload.error ?? "Не удалось оценить ответ.");
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
          ? "У вас пока нет ответов"
          : `${displayName} пока не оставил(а) ответов`}
        description={viewerIsOwner
          ? "Когда вы начнёте отвечать в комментариях, ваши ответы появятся здесь."
          : "Когда здесь появятся ответы, они будут показаны в отдельной вкладке профиля."}
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
              className="mx-4 inline-flex max-w-full items-center gap-1 rounded-none p-0 text-[14px] leading-5 font-medium text-[var(--label-tertiary)] no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4 min-[481px]:mx-5 min-[481px]:mx-6"
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
  const favoritePostsCount = favoritePosts.length;
  const postsCount = posts.length;
  const repliesCount = replies.length;
  const getCounterClassName = (tabKey: ProfileActivityTabKey) =>
    tabKey === selectedKey
      ? "text-[var(--label-tertiary)]"
      : "text-[var(--label-quaternary)]";

  return (
    <Tabs
      variant="secondary"
      selectedKey={selectedKey}
      onSelectionChange={(key) => setSelectedKey(String(key) as ProfileActivityTabKey)}
      className="w-full gap-0"
    >
      <Tabs.ListContainer className="px-6 pt-6">
        <Tabs.List aria-label="Разделы активности профиля">
          <Tabs.Tab key="posts" id="posts" className="h-10 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Посты</span>
              <span className={getCounterClassName("posts")}>{postsCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="replies" id="replies" className="h-10 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Ответы</span>
              <span className={getCounterClassName("replies")}>{repliesCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="favorites" id="favorites" className="h-10 text-[16px] leading-6">
            <span className="inline-flex items-center gap-1.5">
              <span>Избранное</span>
              <span className={getCounterClassName("favorites")}>{favoritePostsCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="!px-0 !pb-0 pt-0" key="posts" id="posts">
        <ProfilePostsSection
          initialPosts={posts}
          emptyTitle={viewerIsOwner
            ? "У вас пока нет опубликованных постов"
            : `${displayName} пока не создал(а) постов`}
          emptyDescription={viewerIsOwner
            ? "Когда вы опубликуете первый пост, он появится здесь в той же ленте, что и на главной."
            : "Когда здесь появятся публикации, они будут показаны в таком же формате, как на главной странице."}
        />
      </Tabs.Panel>

      <Tabs.Panel className="pt-8 pb-24" key="replies" id="replies">
        <RepliesPanel
          displayName={displayName}
          replies={replies}
          viewerIsOwner={viewerIsOwner}
        />
      </Tabs.Panel>

      <Tabs.Panel className="!px-0 !pb-0 pt-0" key="favorites" id="favorites">
        <ProfilePostsSection
          initialPosts={favoritePosts}
          emptyTitle={viewerIsOwner
            ? "У вас пока нет избранного"
            : `${displayName} пока ничего не добавил(а) в избранное`}
          emptyDescription={viewerIsOwner
            ? "Когда вы добавите пост в профиль, он появится здесь."
            : "Когда здесь появятся посты, их можно будет открыть из профиля."}
          removeFromFeedWhenProfileFavoriteRemoved={viewerIsOwner}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
