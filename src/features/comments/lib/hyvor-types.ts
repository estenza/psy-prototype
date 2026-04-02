export type HyvorDataUser = {
  htid: string | null;
  name: string;
  username?: string | null;
  picture_url?: string | null;
};

export type HyvorDataPage = {
  id: number;
  identifier: string;
  title: string | null;
  comments_count: number;
};

export type HyvorDataComment = {
  id: number;
  parent_ids: number[];
  depth: number;
  created_at: number;
  body_json: string;
  body_html: string;
  is_featured: boolean;
  is_loved: boolean;
  is_edited: boolean;
  upvotes: number;
  downvotes: number;
  user: HyvorDataUser;
  page: HyvorDataPage;
};

export type HyvorConsoleComment = {
  id: number;
  status: "published" | "pending" | "spam" | "deleted";
};

export type HyvorWebsiteSettings = {
  id: number;
  auth_type: "hyvor" | "sso";
  auth_sso_type: "stateless" | "openid" | null;
  is_guest_commenting_on: boolean;
  guest_commenting_email: "no" | "optional" | "required";
  comments_min_char_limit: number;
  comments_char_limit: number;
  nested_levels: number;
  premoderation_status: "off" | "guest" | "guest_and_new_commenters" | "all";
  is_images_enabled: boolean;
  is_gifs_enabled: boolean;
  is_inline_styles_enabled: boolean;
  is_mentions_enabled: boolean;
  is_blockquotes_enabled: boolean;
  is_embed_enabled: boolean;
};
