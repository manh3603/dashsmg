export type AccountRole = "artist" | "customer_admin" | "platform_admin";

export type ReleaseStatus =
  | "draft"
  | "pending_qc"
  | "rejected"
  | "sent_to_stores"
  | "live"
  | "takedown"
  | "pending";

export type CatalogItem = {
  id: string;
  title: string;
  type: "Single" | "Album/EP";
  status: ReleaseStatus;
  isrc: string;
  upc: string;
  updated: string;
  artist?: string;
  storesSelected?: string[];
  /** DDEX / vận hành */
  labelName?: string;
  language?: string;
  genreMain?: string;
  genreSub?: string;
  territories?: string;
  releaseDate?: string;
  preorder?: boolean;
  composer?: string;
  artistFeatured?: string;
  audioAssetUrl?: string;
  coverAssetUrl?: string;
  pline?: string;
  cline?: string;
  version?: string;
  /** ISO 8601 duration, ví dụ PT3M30.000S — bắt buộc nội dung hợp lệ trong ERN 3.82 (hoặc dùng DDEX_DEFAULT_AUDIO_DURATION_PT). */
  durationIso8601?: string;
  /** Ghi chú QC: lý do từ chối / yêu cầu chỉnh sửa — khách xem trong kho nhạc. */
  qcFeedback?: string;
};

export type CisDeliveryAuditRow = {
  releaseId: string;
  storeKey: string;
  pushed: boolean;
  skipped?: boolean;
  httpStatus?: number;
  error?: string;
};

export type DdexBatchResult = {
  batchId: string;
  at: string;
  releaseIds: string[];
  files: { releaseId: string; filename: string; path: string; storeKey?: string }[];
  skipped?: { releaseId: string; reason: string }[];
  /** Có khi CIS_AUTO_DELIVERY=true và đã thử gửi HTTP */
  cisDelivery?: CisDeliveryAuditRow[];
};
