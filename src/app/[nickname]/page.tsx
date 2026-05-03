import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProfilePageContent } from "@/features/auth/components/profile-page-content";
import { listAuthorPublishedComments } from "@/features/comments/lib/comments-service";
import { findUserByNickname } from "@/features/auth/lib/auth-repository";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  listAuthorProfileFavoritePosts,
  listAuthorProfilePosts,
} from "@/features/feed/lib/post-query-service";
import { getAuthorFollowSummary } from "@/features/social/lib/follows-repository";
import {
  buildProfilePathFromNickname,
  getUserHandle,
  normalizeNickname,
} from "@/features/auth/lib/profile";
import { buildAbsoluteAppUrl, buildPublicAppUrl } from "@/lib/app-url";

type PublicProfilePageProps = {
  params: Promise<{
    nickname: string;
  }>;
};

function resolveMetadataImageUrl(src: string | null | undefined, appUrl: string) {
  if (!src) {
    return null;
  }

  try {
    const imageUrl = new URL(src, appUrl);
    return imageUrl.protocol === "http:" || imageUrl.protocol === "https:"
      ? imageUrl.toString()
      : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { nickname: rawNickname } = await params;
  const normalizedNickname = normalizeNickname(rawNickname);
  const canonicalProfilePath = buildProfilePathFromNickname(normalizedNickname);

  if (!canonicalProfilePath) {
    return {
      title: "Профиль · внутри",
      description: "Психологическая платформа",
    };
  }

  const profileUser = await findUserByNickname(normalizedNickname);

  if (!profileUser) {
    return {
      title: "Профиль · внутри",
      description: "Психологическая платформа",
    };
  }

  const appUrl = buildPublicAppUrl();
  const handle = getUserHandle(profileUser);
  const title = `${profileUser.displayName} (${handle}) · внутри`;
  const description =
    profileUser.profileDescription?.trim()
    || `Профиль ${handle} на психологической платформе внутри.`;
  const canonicalUrl = buildAbsoluteAppUrl(canonicalProfilePath);
  const imageUrl = resolveMetadataImageUrl(
    profileUser.profileCoverUrl || profileUser.avatarCardUrl || profileUser.avatarUrl,
    appUrl,
  );

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "profile",
      url: canonicalUrl,
      siteName: "внутри",
      title,
      description,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: profileUser.displayName,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { nickname: rawNickname } = await params;
  const normalizedNickname = normalizeNickname(rawNickname);
  const canonicalProfilePath = buildProfilePathFromNickname(normalizedNickname);

  if (!canonicalProfilePath) {
    notFound();
  }

  if (rawNickname !== normalizedNickname) {
    redirect(canonicalProfilePath);
  }

  const [currentUser, profileUser] = await Promise.all([
    getCurrentUser(),
    findUserByNickname(normalizedNickname),
  ]);

  if (!profileUser) {
    notFound();
  }

  const [posts, favoritePosts, replies, followSummary] = await Promise.all([
    listAuthorProfilePosts(profileUser.id, currentUser),
    listAuthorProfileFavoritePosts(profileUser.id, currentUser),
    listAuthorPublishedComments({
      authorUserId: profileUser.id,
      viewerUserId: currentUser?.id ?? null,
    }),
    getAuthorFollowSummary(profileUser.id, currentUser?.id ?? null),
  ]);

  return (
    <ProfilePageContent
      posts={posts}
      favoritePosts={favoritePosts}
      followSummary={followSummary}
      user={profileUser}
      replies={replies}
      viewerIsOwner={currentUser?.id === profileUser.id}
      profilePath={canonicalProfilePath}
    />
  );
}
