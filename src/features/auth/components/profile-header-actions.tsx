"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { ProfileEditModal } from "@/features/auth/components/profile-edit-modal";
import { ProfileMoreMenu } from "@/features/auth/components/profile-more-menu";

type ProfileHeaderActionsProps = {
  avatarSeed: string;
  avatarSourceUrl: string | null;
  avatarUrl: string | null;
  displayName: string;
  profileCoverUrl: string | null;
  profileDescription: string | null;
  profilePath: string;
  showProfileCover: boolean;
  userHandle: string;
  userId: string;
  viewerIsOwner: boolean;
};

export function ProfileHeaderActions({
  avatarSeed,
  avatarSourceUrl,
  avatarUrl,
  displayName,
  profileCoverUrl,
  profileDescription,
  profilePath,
  showProfileCover,
  userHandle,
  userId,
  viewerIsOwner,
}: ProfileHeaderActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-auto flex items-center justify-end gap-2">
        {viewerIsOwner ? (
          <button
            type="button"
            className={buttonClassName({
              variant: "secondary",
              className: "h-9 px-4 text-[14px] font-medium",
            })}
            onClick={() => setIsEditModalOpen(true)}
          >
            <span className="min-[640px]:hidden">Изменить</span>
            <span className="hidden min-[640px]:inline">Изменить профиль</span>
          </button>
        ) : null}

        <ProfileMoreMenu
          profilePath={profilePath}
          userHandle={userHandle}
          userId={userId}
          viewerIsOwner={viewerIsOwner}
        />
      </div>

      {viewerIsOwner ? (
        <ProfileEditModal
          avatarSeed={avatarSeed}
          avatarSourceUrl={avatarSourceUrl}
          avatarUrl={avatarUrl}
          displayName={displayName}
          isOpen={isEditModalOpen}
          profileCoverUrl={profileCoverUrl}
          profileDescription={profileDescription}
          showProfileCover={showProfileCover}
          onClose={() => setIsEditModalOpen(false)}
        />
      ) : null}
    </>
  );
}
