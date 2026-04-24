"use client";

import { Tabs } from "@heroui/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentItem } from "@/features/comments/components/comment-item";
import type { ProfileCommentItem } from "@/features/comments/types";
import { ProfileDiscussionsSection } from "@/features/feed/components/profile-discussions-section";
import { buildDiscussionHref } from "@/features/feed/lib/discussion-navigation";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

type ProfileActivityTabKey = "discussions" | "replies" | "saved";

type ProfileActivityTabsProps = {
  displayName: string;
  discussions: Post[];
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
    <div className="surface-card flex justify-center px-5 py-12 text-center sm:px-6 sm:py-16">
      <div className="max-w-[640px]">
        <h2 className="type-empty-state-title text-label-primary">
          {title}
        </h2>
        <p className="type-empty-state-body text-label-tertiary mt-3">
          {description}
        </p>
      </div>
    </div>
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
    <div className="space-y-2 min-[481px]:space-y-3 min-[721px]:space-y-4">
      {items.map((reply) => (
        <CommentItem
          key={reply.id}
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
          showMenu={false}
          showReplyAction={false}
          bodySurface
          onOpen={() => {
            router.push(buildDiscussionHref(reply.discussionId, currentProfilePath, reply.id));
          }}
        />
      ))}
    </div>
  );
}

function SavedPanel({
  viewerIsOwner,
}: {
  viewerIsOwner: boolean;
}) {
  return (
    <EmptyState
      title={viewerIsOwner
        ? "Сохранённое пока пусто"
        : "Сохранённое недоступно в публичном профиле"}
      description={viewerIsOwner
        ? "Когда сохранение обсуждений будет подключено постоянно, материалы появятся здесь."
        : "Этот раздел не показывается другим пользователям."}
    />
  );
}

export function ProfileActivityTabs({
  displayName,
  discussions,
  replies,
  viewerIsOwner,
}: ProfileActivityTabsProps) {
  const [selectedKey, setSelectedKey] = useState<ProfileActivityTabKey>("discussions");
  const discussionsCount = discussions.length;
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
      <Tabs.ListContainer className="px-6">
        <Tabs.List aria-label="Разделы активности профиля">
          <Tabs.Tab key="discussions" id="discussions" className="h-10">
            <span className="inline-flex items-center gap-1.5">
              <span>Обсуждения</span>
              <span className={getCounterClassName("discussions")}>{discussionsCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="replies" id="replies" className="h-10">
            <span className="inline-flex items-center gap-1.5">
              <span>Ответы</span>
              <span className={getCounterClassName("replies")}>{repliesCount}</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="saved" id="saved" className="h-10">
            Сохранённое
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel className="!px-0 !pb-0 pt-0" key="discussions" id="discussions">
        <ProfileDiscussionsSection
          initialPosts={discussions}
          emptyTitle={viewerIsOwner
            ? "У вас пока нет опубликованных обсуждений"
            : `${displayName} пока не создал(а) обсуждения`}
          emptyDescription={viewerIsOwner
            ? "Когда вы опубликуете первое обсуждение, оно появится здесь в той же ленте, что и на главной."
            : "Когда здесь появятся публикации, они будут показаны в таком же формате, как на главной странице."}
        />
      </Tabs.Panel>

      <Tabs.Panel className="px-2 pt-8 pb-24 min-[481px]:px-3 min-[721px]:px-0" key="replies" id="replies">
        <RepliesPanel
          displayName={displayName}
          replies={replies}
          viewerIsOwner={viewerIsOwner}
        />
      </Tabs.Panel>

      <Tabs.Panel className="px-2 pt-8 min-[481px]:px-3 min-[721px]:px-0" key="saved" id="saved">
        <SavedPanel viewerIsOwner={viewerIsOwner} />
      </Tabs.Panel>
    </Tabs>
  );
}
