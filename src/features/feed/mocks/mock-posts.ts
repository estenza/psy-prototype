import { mapApiPostsToFeed } from "@/features/feed/lib/post-adapter";
import type { Post } from "@/features/feed/types";
import { mockApiPosts } from "@/features/feed/mocks/mock-api-posts";

// Keep the adapter in the loop so mock UI data stays aligned with the future API mapping.
export const mockPosts: Post[] = mapApiPostsToFeed(mockApiPosts);
