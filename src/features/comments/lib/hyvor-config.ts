import {
  HYVOR_CONSOLE_API_BASE_URL,
  HYVOR_DATA_API_BASE_URL,
  HYVOR_TALK_FALLBACK_WEBSITE_ID,
  PROTOTYPE_COMMENTS_VIEWER,
} from "@/features/comments/constants";
import { getUserHandle } from "@/features/auth/lib/profile";
import { getInitials } from "@/features/comments/lib/comment-format";
import type {
  CommentsCapabilities,
  CommentsViewer,
} from "@/features/comments/types";
import type { HyvorWebsiteSettings } from "@/features/comments/lib/hyvor-types";
import type { SessionUser } from "@/features/auth/types";

export type HyvorServerConfig = {
  websiteId: string;
  dataApiBaseUrl: string;
  dataApiKey: string | null;
  usePublicDataAccess: boolean;
  consoleApiBaseUrl: string;
  consoleApiKey: string | null;
  viewer: CommentsViewer;
};

export function buildCommentsViewer(currentUser: SessionUser | null): CommentsViewer {
  if (!currentUser) {
    return PROTOTYPE_COMMENTS_VIEWER;
  }

  return {
    avatarUrl: currentUser.avatarUrl,
    displayName: currentUser.displayName,
    handle: getUserHandle(currentUser),
    initials: getInitials(currentUser.displayName),
    hyvorUserHtid: `sso_${currentUser.id}`,
    isAuthenticated: true,
    kind: "guest-prototype",
  };
}

export function getHyvorServerConfig(viewer?: CommentsViewer): HyvorServerConfig {
  return {
    websiteId:
      process.env.HYVOR_TALK_WEBSITE_ID?.trim() ||
      HYVOR_TALK_FALLBACK_WEBSITE_ID,
    dataApiBaseUrl: HYVOR_DATA_API_BASE_URL,
    dataApiKey: process.env.HYVOR_TALK_DATA_API_KEY?.trim() || null,
    usePublicDataAccess:
      process.env.HYVOR_TALK_DATA_API_PUBLIC?.trim() !== "false",
    consoleApiBaseUrl: HYVOR_CONSOLE_API_BASE_URL,
    consoleApiKey: process.env.HYVOR_TALK_CONSOLE_API_KEY?.trim() || null,
    viewer: viewer ?? PROTOTYPE_COMMENTS_VIEWER,
  };
}

export function buildCommentsCapabilities(
  config: HyvorServerConfig,
  websiteSettings?: HyvorWebsiteSettings | null,
): CommentsCapabilities {
  const limitations = [
    "Без Hyvor SSO и локальной сессии нельзя надёжно атрибутировать vote/report текущему пользователю.",
    "Owner edit/delete для custom UI не подтверждены docs как полноценный end-user flow вне embed.",
    "Standalone Hyvor editor SDK для GIF, mentions и embed picker не документирован.",
  ];

  let canPostAsCurrentViewer = Boolean(config.consoleApiKey);
  let postDisabledReason: string | null = null;

  if (!config.consoleApiKey) {
    canPostAsCurrentViewer = false;
    postDisabledReason =
      "Комментирование в этой версии интерфейса пока недоступно.";
  } else if (websiteSettings) {
    const currentViewerIsGuestPrototype = config.viewer.kind === "guest-prototype";

    if (
      currentViewerIsGuestPrototype &&
      !websiteSettings.is_guest_commenting_on
    ) {
      canPostAsCurrentViewer = false;
      postDisabledReason =
        "Комментирование сейчас временно недоступно.";
      limitations.unshift(
        "Текущий сайт Hyvor использует auth_type=hyvor и выключенный guest commenting, поэтому custom end-user posting через документированный POST /comment сейчас недоступен.",
      );
    } else if (
      currentViewerIsGuestPrototype &&
      websiteSettings.guest_commenting_email === "required"
    ) {
      canPostAsCurrentViewer = false;
      postDisabledReason =
        "Комментирование сейчас временно недоступно.";
      limitations.unshift(
        "Для guest posting у этого сайта обязателен guest_email, поэтому current composer должен сначала собирать email.",
      );
    }
  }

  return {
    canRead: Boolean(config.websiteId),
    canPost: canPostAsCurrentViewer,
    canReply: canPostAsCurrentViewer,
    canVote: false,
    canReport: Boolean(config.consoleApiKey),
    canEditOwnComments: false,
    canDeleteOwnComments: false,
    authMode:
      config.viewer.kind === "anonymous" ? "unknown" : config.viewer.kind,
    editorMode: "custom-plain",
    postDisabledReason,
    limitations,
  };
}
