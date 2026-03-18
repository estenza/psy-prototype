import { mapApiPostsToFeed } from "@/lib/post-adapter";
import type { Post } from "@/types/feed";
import { mockApiPosts } from "@/features/feed/mocks/mock-api-posts";

export const mockPosts: Post[] = mapApiPostsToFeed(mockApiPosts);
