"use client";

import { Dropdown, Label, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import {
  EditOutlineIcon,
  FlagIcon,
  IgnoreAuthorIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import {
  requestIgnoreAuthor,
  showIgnoredAuthorToast,
} from "@/features/feed/lib/ignored-author-client";

type ProfileMoreMenuProps = {
  profilePath: string;
  userHandle: string;
  userId: string;
  viewerIsOwner: boolean;
};

type ProfileMenuItem = {
  icon: ReactNode;
  id: "edit" | "ignore" | "report" | "share";
  label: string;
  onSelect: () => void | Promise<void>;
};

export function ProfileMoreMenu({
  profilePath,
  userHandle,
  userId,
  viewerIsOwner,
}: ProfileMoreMenuProps) {
  const router = useRouter();
  const { runIfAuthorized } = useAuthRequiredAction();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleShare = useCallback(async () => {
    const profileUrl = new URL(profilePath, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ url: profileUrl });
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      toast.success("Ссылка на профиль скопирована.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.danger("Не удалось поделиться ссылкой.");
    }
  }, [profilePath]);

  const items = useMemo<ProfileMenuItem[]>(() => {
    if (viewerIsOwner) {
      return [
        {
          id: "edit",
          label: "Редактировать профиль",
          icon: <EditOutlineIcon />,
          onSelect: () => {
            router.push("/settings/account");
          },
        },
        {
          id: "share",
          label: "Поделиться",
          icon: <ShareIcon />,
          onSelect: handleShare,
        },
      ];
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
      {
        id: "share",
        label: "Поделиться",
        icon: <ShareIcon />,
        onSelect: handleShare,
      },
    ];
  }, [handleShare, router, runIfAuthorized, userHandle, userId, viewerIsOwner]);

  return (
    <div className="pointer-events-auto relative z-30 shrink-0">
      <Dropdown.Root isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <MoreMenuButton ariaLabel="Еще" isTooltipDisabled={isMenuOpen} />

        <DropdownPopover placement="bottom end" className="min-w-[220px]">
          <Dropdown.Menu
            aria-label="Меню профиля"
            selectionMode="none"
            className="dropdown-menu-default"
            onAction={(key) => {
              const item = items.find((entry) => entry.id === key);
              void item?.onSelect();
            }}
          >
            {items.map((item) => (
              <Dropdown.Item key={item.id} id={item.id} textValue={item.label}>
                <div className="flex w-full items-center gap-3">
                  <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                    {item.icon}
                  </span>
                  <Label className="min-w-0 flex-1 truncate">
                    {item.label}
                  </Label>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </DropdownPopover>
      </Dropdown.Root>
    </div>
  );
}
