"use client";

import { toast } from "@/components/feedback/toast";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  FlagIcon,
  IgnoreAuthorIcon,
  LinkActionIcon,
  TelegramIcon,
} from "@/components/ui/icons";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import { ResponsiveActionMenu } from "@/components/ui/responsive-action-menu";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import {
  requestIgnoreAuthor,
  showIgnoredAuthorToast,
} from "@/features/feed/lib/ignored-author-client";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

type ProfileMoreMenuProps = {
  profilePath: string;
  userHandle: string;
  userId: string;
  viewerIsOwner: boolean;
};

type ProfileMenuItem = {
  icon: ReactNode;
  id: "copy-link" | "ignore" | "report" | "telegram";
  label: string;
  onSelect: () => void | Promise<void>;
};

export function ProfileMoreMenu({
  profilePath,
  userHandle,
  userId,
  viewerIsOwner,
}: ProfileMoreMenuProps) {
  const { runIfAuthorized } = useAuthRequiredAction();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getProfileUrl = useCallback(() => {
    return new URL(profilePath, window.location.origin).toString();
  }, [profilePath]);

  const handleCopyLink = useCallback(async () => {
    const copied = await copyTextToClipboard(getProfileUrl());

    if (copied) {
      toast.success("Ссылка на профиль скопирована.");
      return;
    }

    toast.danger("Не удалось поделиться ссылкой.");
  }, [getProfileUrl]);

  const handleTelegramShare = useCallback(() => {
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", getProfileUrl());
    telegramShareUrl.searchParams.set("text", userHandle);

    const openedWindow = window.open(
      telegramShareUrl.toString(),
      "_blank",
      "noopener,noreferrer",
    );

    if (!openedWindow) {
      window.location.href = telegramShareUrl.toString();
    }
  }, [getProfileUrl, userHandle]);

  const shareItems = useMemo<ProfileMenuItem[]>(() => [
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
  ], [handleCopyLink, handleTelegramShare]);

  const items = useMemo<ProfileMenuItem[]>(() => {
    if (viewerIsOwner) {
      return shareItems;
    }

    return [
      {
        id: "ignore",
        label: "Игнорировать",
        icon: <IgnoreAuthorIcon />,
        onSelect: () => {
          void runIfAuthorized(async () => {
            await requestIgnoreAuthor(userId);
            showIgnoredAuthorToast({
              authorHandle: userHandle,
              ignoredUserId: userId,
            });
          }).catch((error: unknown) => {
            const message = error instanceof Error
              ? error.message
              : "Не удалось обновить игнор-лист.";
            toast.danger(message);
          });
        },
      },
      {
        id: "report",
        label: "Пожаловаться",
        icon: <FlagIcon />,
        onSelect: () => {
          void runIfAuthorized(() => {
            toast.success("Жалоба отправлена.");
          });
        },
      },
      ...shareItems,
    ];
  }, [runIfAuthorized, shareItems, userHandle, userId, viewerIsOwner]);

  return (
    <div className="pointer-events-auto relative z-30 shrink-0">
      <ResponsiveActionMenu
        ariaLabel="Меню профиля"
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        items={items}
        popoverClassName="min-w-[220px]"
        renderTrigger={({ isOpen, isMobile, open }) => (
          <MoreMenuButton
            ariaLabel="Еще"
            aria-expanded={isOpen}
            isTooltipDisabled={isOpen}
            onPress={isMobile ? open : undefined}
          />
        )}
      />
    </div>
  );
}
