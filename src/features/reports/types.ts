export type ContentReportObjectType = "comment" | "post";

export type ContentReportReason =
  | "abuse"
  | "illegal"
  | "misleading"
  | "other"
  | "politics"
  | "pornography"
  | "spam"
  | "violence";

export type ContentReportStatus =
  | "action_taken"
  | "dismissed"
  | "open"
  | "reviewed";

export type AdminReportsFilters = {
  objectType: ContentReportObjectType | "all";
  reason: ContentReportReason | "all";
  search: string;
  status: ContentReportStatus | "all";
};

export type AdminReportsUncheckedCounts = {
  comment: number;
  post: number;
  total: number;
};

export type AdminReportAction =
  | "ban-author"
  | "delete-content"
  | "dismiss"
  | "hide-content"
  | "mark-reviewed";

export type AdminReportItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  objectType: ContentReportObjectType;
  objectId: string;
  postId: string | null;
  commentId: string | null;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  contentStatus: string | null;
  contentFragment: string;
  reporter: {
    id: string;
    name: string;
    handle: string;
  };
  contentAuthor: {
    id: string;
    name: string;
    handle: string;
  };
};

export type CreateContentReportPayload = {
  reason?: ContentReportReason | null;
  details?: string | null;
};

export type ContentReportResponse = {
  ok: true;
};

export type AdminReportsResponse = {
  filters: AdminReportsFilters;
  reports: AdminReportItem[];
};
