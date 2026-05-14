"use client";

import { Modal } from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buttonClassName } from "@/components/ui/button-styles";
import { CloseIcon, VerifiedSpecialistIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import {
  buildProfilePathFromNickname,
  getUserHandle,
} from "@/features/auth/lib/profile";
import type { AuthorFollowListUser } from "@/features/auth/types";

type ProfileFollowsModalProps = {
  followers: AuthorFollowListUser[];
  following: AuthorFollowListUser[];
};

type FollowModalView = "followers" | "following";

function getModalView(value: string | null): FollowModalView | null {
  return value === "followers" || value === "following" ? value : null;
}

function FollowListItem({ user }: { user: AuthorFollowListUser }) {
  const profilePath = buildProfilePathFromNickname(user.nickname);
  const handle = getUserHandle(user);
  const isVerifiedSpecialist =
    user.role === "specialist" && user.specialistStatus === "verified";
  const content = (
    <>
      <UserAvatar
        avatarUrl={user.avatarUrl}
        avatarSeed={user.nickname || user.id}
        name={user.displayName}
        size="follow-list"
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[16px] font-semibold leading-5 text-[var(--label-primary)]">
            {user.displayName}
          </span>
          {isVerifiedSpecialist ? <VerifiedSpecialistIcon size={16} /> : null}
        </span>
        <span className="block truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
          {handle}
        </span>
      </span>
    </>
  );

  if (!profilePath) {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-[20px] px-2 py-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={profilePath}
      className="flex min-w-0 items-center gap-3 rounded-[20px] px-2 py-3 no-underline transition-colors hover:bg-[var(--fill-control-subtle)] focus-visible:bg-[var(--fill-control-subtle)] focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}

export function ProfileFollowsModal({
  followers,
  following,
}: ProfileFollowsModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = getModalView(searchParams.get("view"));
  const isOpen = Boolean(view);
  const items = view === "following" ? following : followers;
  const title = view === "following" ? "Подписки" : "Подписчики";
  const emptyText = view === "following"
    ? "Пока нет подписок"
    : "Пока нет подписчиков";

  function closeModal() {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("view");
    const nextSearch = nextSearchParams.toString();
    router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ""}`, {
      scroll: false,
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable
      className="fixed inset-0 z-[240]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center !p-4">
        <Modal.Dialog
          aria-label={title}
          className="modal-surface min-h-[320px] w-full max-w-[480px] overflow-hidden p-0"
        >
          <Modal.Body className="p-0">
            <header className="border-separator relative border-b px-14 py-4 text-center">
              <h2 className="type-h3 font-semibold text-[var(--label-primary)]">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                className={buttonClassName({
                  className: "absolute right-3 top-1/2 -translate-y-1/2 text-[var(--label-primary)]",
                  isIconOnly: true,
                  size: "sm",
                  variant: "quaternary",
                })}
                onClick={closeModal}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="max-h-[min(560px,calc(100dvh-160px))] overflow-y-auto px-2 py-2">
              {items.length > 0 ? (
                items.map((user) => (
                  <FollowListItem key={user.id} user={user} />
                ))
              ) : (
                <div className="px-5 py-10 text-center text-[16px] leading-6 text-[var(--label-tertiary)]">
                  {emptyText}
                </div>
              )}
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
