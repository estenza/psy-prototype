import type { Metadata } from "next";
import { PostViewScreen } from "@/features/feed/components/post-view-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { getPostForViewer } from "@/features/feed/lib/post-query-service";
import { buildAbsoluteAppUrl, buildPublicAppUrl } from "@/lib/app-url";

type PostPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
    commentId?: string;
    commentIds?: string;
  }>;
};

const FALLBACK_POST_DESCRIPTION = "Пост на платформе внутри.";

function resolveMetadataImageUrl(src: string, appUrl: string) {
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
}: Pick<PostPageProps, "params">): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPostForViewer(postId, null);

  if (!post) {
    return {
      title: "Пост · внутри",
      description: FALLBACK_POST_DESCRIPTION,
    };
  }

  const appUrl = buildPublicAppUrl();
  const title = `${post.content.title} · внутри`;
  const description = post.content.excerpt || FALLBACK_POST_DESCRIPTION;
  const canonicalUrl = buildAbsoluteAppUrl(`/posts/${post.id}`);
  const imageUrl = post.media?.src
    ? resolveMetadataImageUrl(post.media.src, appUrl)
    : null;
  const imageAlt = post.media?.alt || post.content.title;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      siteName: "внутри",
      title,
      description,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: imageAlt,
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

export default async function PostPage({
  params,
  searchParams,
}: PostPageProps) {
  const { postId } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  const initialPost = await getPostForViewer(postId, currentUser);
  const highlightedCommentIds = [
    ...(resolvedSearchParams.commentIds
      ?.split(",")
      .map((commentId) => commentId.trim())
      .filter(Boolean) ?? []),
    ...(resolvedSearchParams.commentId ? [resolvedSearchParams.commentId] : []),
  ];

  return (
    <PostViewScreen
      key={postId}
      initialPost={initialPost}
      initialReturnTo={resolvedSearchParams.returnTo ?? null}
      initialHighlightedCommentIds={[...new Set(highlightedCommentIds)]}
    />
  );
}
