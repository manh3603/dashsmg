/** platform_admin = vận hành SMG (CMS, QC, quản lý tài khoản). customer_admin = admin label/khách (QC, không CMS/tài khoản hệ thống). */
export type AccountRole = "artist" | "customer_admin" | "platform_admin";

export type ReleaseStatus =
  | "draft"
  | "pending_qc"
  | "rejected"
  | "sent_to_stores"
  | "live"
  /** Đã gửi yêu cầu gỡ / takedown khỏi cửa hàng (metadata hệ thống — xử lý thật theo quy trình đối tác). */
  | "takedown"
  /** @deprecated dùng pending_qc — giữ để tương thích dữ liệu cũ */
  | "pending";

export type CatalogAlbumTrack = {
  audioAssetUrl: string;
  isrc?: string;
  title?: string;
  filename?: string;
};

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
  /** Album/EP: nhiều file master — mỗi track một ISRC + URL (DDEX). */
  albumTracks?: CatalogAlbumTrack[];
  coverAssetUrl?: string;
  pline?: string;
  cline?: string;
  /** Phiên bản hiển thị (Radio Edit, Extended…) — đưa vào tiêu đề ERN khi có */
  version?: string;
  durationIso8601?: string;
  /** QC: lý do từ chối hoặc yêu cầu chỉnh sửa — hiển thị cho khách trong kho nhạc. */
  qcFeedback?: string;
};

export type ManagedUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  orgLabel?: string;
  createdAt: string;
  /** % phần doanh thu net theo hợp đồng (0–100), tuỳ deal từng nghệ sĩ / label. */
  royaltySharePercent?: number;
};

export type CmsStore = {
  id: string;
  name: string;
  cmsEndpoint: string;
  apiKeySet: boolean;
  enabled: boolean;
  regionNote?: string;
};

const KEY_ROLE = "smg_role";
const KEY_LOGIN = "smg_login";
const KEY_DISPLAY = "smg_display_name";
/** Phiên API (Bearer) — do backend cấp sau đăng nhập. */
const KEY_API_SESSION = "smg_api_session_token";
const KEY_STORES = "smg_cms_stores";
const KEY_CATALOG = "smg_catalog";
const KEY_MANAGED_USERS = "smg_managed_users";
const KEY_PARTNER_SFTP = "smg_partner_sftp";

export type PartnerSftpConfig = {
  host: string;
  port: number;
  username: string;
  /** Chỉ cờ đã nhập mật khẩu (cấu hình cục bộ; production nên dùng backend/.env). */
  passwordSet: boolean;
  remotePath: string;
  note: string;
};

const DEFAULT_SFTP: PartnerSftpConfig = {
  host: "",
  port: 22,
  username: "",
  passwordSet: false,
  remotePath: "/incoming",
  note: "",
};

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("smg-storage"));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Mặc định rỗng — quản trị thêm cửa hàng trong CMS khi đối tác cấp kết nối. */
export const DEFAULT_CMS_STORES: CmsStore[] = [];

const INITIAL_CATALOG: CatalogItem[] = [];

const ROLES: AccountRole[] = ["artist", "customer_admin", "platform_admin"];

function normalizeStoredRole(r: string | null): AccountRole | null {
  if (!r) return null;
  if (r === "owner") return "platform_admin";
  return ROLES.includes(r as AccountRole) ? (r as AccountRole) : null;
}

export function getRole(): AccountRole | null {
  if (typeof window === "undefined") return null;
  return normalizeStoredRole(localStorage.getItem(KEY_ROLE));
}

/** Gán vai trò không kèm phiên đăng nhập (ví dụ luồng cũ); xóa login hiển thị. */
export function setRole(role: AccountRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_ROLE, role);
  localStorage.removeItem(KEY_LOGIN);
  localStorage.removeItem(KEY_DISPLAY);
  emit();
}

export function setSession(
  role: AccountRole,
  login: string,
  displayName: string,
  apiSessionToken?: string | null
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_ROLE, role);
  localStorage.setItem(KEY_LOGIN, login.trim());
  localStorage.setItem(KEY_DISPLAY, displayName.trim());
  if (apiSessionToken === undefined) {
    localStorage.removeItem(KEY_API_SESSION);
  } else if (apiSessionToken === null || apiSessionToken.trim() === "") {
    localStorage.removeItem(KEY_API_SESSION);
  } else {
    localStorage.setItem(KEY_API_SESSION, apiSessionToken.trim());
  }
  emit();
}

export function getApiSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem(KEY_API_SESSION);
  return s?.trim() || null;
}

export function getLogin(): string | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem(KEY_LOGIN);
  return s?.trim() || null;
}

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem(KEY_DISPLAY);
  return s?.trim() || null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_ROLE);
  localStorage.removeItem(KEY_LOGIN);
  localStorage.removeItem(KEY_DISPLAY);
  localStorage.removeItem(KEY_API_SESSION);
  emit();
}

export function getManagedUsers(): ManagedUserRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_MANAGED_USERS);
  if (raw === null) {
    localStorage.setItem(KEY_MANAGED_USERS, JSON.stringify([]));
    return [];
  }
  return safeParse<ManagedUserRecord[]>(raw, []);
}

export function saveManagedUsers(users: ManagedUserRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_MANAGED_USERS, JSON.stringify(users));
  emit();
}

export function upsertManagedUser(entry: Omit<ManagedUserRecord, "id" | "createdAt"> & { id?: string }): ManagedUserRecord {
  const all = getManagedUsers();
  const emailNorm = entry.email.trim().toLowerCase();
  const existingByEmail = all.findIndex((u) => u.email.toLowerCase() === emailNorm);
  const id =
    entry.id?.trim() || (existingByEmail >= 0 ? all[existingByEmail].id : `mu-${Date.now()}`);
  let royalty: number | undefined;
  if ("royaltySharePercent" in entry) {
    const raw = entry.royaltySharePercent;
    if (raw === undefined || raw === null) {
      royalty = undefined;
    } else {
      const n = Number(raw);
      royalty = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined;
    }
  } else {
    royalty = all.find((u) => u.id === id)?.royaltySharePercent;
  }
  const row: ManagedUserRecord = {
    id,
    email: entry.email.trim(),
    displayName: entry.displayName.trim(),
    role: entry.role,
    orgLabel: entry.orgLabel?.trim() || undefined,
    createdAt: all.find((u) => u.id === id)?.createdAt ?? new Date().toISOString().slice(0, 10),
    royaltySharePercent: royalty,
  };
  const i = all.findIndex((u) => u.id === id);
  if (i >= 0) all[i] = row;
  else all.push(row);
  saveManagedUsers(all);
  return row;
}

export function removeManagedUser(id: string): void {
  saveManagedUsers(getManagedUsers().filter((u) => u.id !== id));
}

export function getCmsStores(): CmsStore[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_STORES);
  if (raw === null) {
    localStorage.setItem(KEY_STORES, JSON.stringify([]));
    return [];
  }
  return safeParse<CmsStore[]>(raw, []);
}

export function saveCmsStores(stores: CmsStore[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_STORES, JSON.stringify(stores));
  emit();
}

export function addCmsStore(entry: Omit<CmsStore, "apiKeySet"> & { apiKey?: string }): void {
  const stores = getCmsStores();
  const { apiKey, ...rest } = entry;
  const apiKeySet = Boolean(apiKey?.trim());
  stores.push({ ...rest, apiKeySet });
  saveCmsStores(stores);
}

export function getCatalog(): CatalogItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_CATALOG);
  if (raw === null) {
    localStorage.setItem(KEY_CATALOG, JSON.stringify(INITIAL_CATALOG));
    return [];
  }
  return safeParse<CatalogItem[]>(raw, []);
}

export function getPartnerSftpConfig(): PartnerSftpConfig {
  if (typeof window === "undefined") return DEFAULT_SFTP;
  return safeParse<PartnerSftpConfig>(localStorage.getItem(KEY_PARTNER_SFTP), DEFAULT_SFTP);
}

export function savePartnerSftpConfig(cfg: PartnerSftpConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PARTNER_SFTP, JSON.stringify(cfg));
  emit();
}

export function saveCatalog(items: CatalogItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CATALOG, JSON.stringify(items));
  emit();
}

export function upsertCatalogItem(item: CatalogItem): void {
  const all = getCatalog();
  const i = all.findIndex((x) => x.id === item.id);
  if (i >= 0) all[i] = item;
  else all.unshift(item);
  saveCatalog(all);
}

export type CatalogStatusPatch = {
  qcFeedback?: string | null;
};

export function updateCatalogStatus(id: string, status: ReleaseStatus, patch?: CatalogStatusPatch): boolean {
  try {
    const all = getCatalog();
    const i = all.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const prev = all[i];
    let qcFeedback = prev.qcFeedback;
    if (patch && "qcFeedback" in patch) {
      qcFeedback =
        patch.qcFeedback == null || String(patch.qcFeedback).trim() === ""
          ? undefined
          : String(patch.qcFeedback).trim();
    }
    all[i] = {
      ...prev,
      status,
      qcFeedback,
      updated: new Date().toISOString().slice(0, 10),
    };
    saveCatalog(all);
  } catch (e) {
    console.error("[smg-storage] updateCatalogStatus", e);
    return false;
  }
  if (typeof window !== "undefined") {
    void import("./catalog-sync").then((m) => m.pushStatusToBackendAfterLocalUpdate(id));
  }
  return true;
}

export function removeCatalogItem(id: string): void {
  const all = getCatalog().filter((x) => x.id !== id);
  saveCatalog(all);
  if (typeof window !== "undefined") {
    void import("./catalog-sync").then((m) => m.deleteReleaseOnBackendAfterLocalRemove(id));
  }
}

export type SubmitReleaseToQCPayload = {
  releaseKind: "single" | "album_ep";
  form: {
    productName: string;
    language: string;
    genreMain: string;
    genreSub: string;
    label: string;
    artistMain: string;
    artistFeatured: string;
    composer: string;
    isrc: string;
    upc: string;
    preorder: boolean;
    releaseDate: string;
    territories: string;
    stores: Record<string, boolean>;
    audioAssetUrl: string;
    coverAssetUrl: string;
    pline: string;
    cline: string;
    version: string;
    /** Album/EP — nhiều track đã upload (URL + ISRC). */
    albumTracks?: { filename: string; url: string; isrc: string; title: string }[];
  };
};

function buildCatalogItemFromForm(id: string, payload: SubmitReleaseToQCPayload, base?: CatalogItem): CatalogItem {
  const selected = Object.entries(payload.form.stores)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const f = payload.form;
  const headAlbumTrack = f.albumTracks?.length ? f.albumTracks[0]! : null;
  const patch: CatalogItem = {
    id,
    title: f.productName,
    type: payload.releaseKind === "single" ? "Single" : "Album/EP",
    status: "pending_qc",
    isrc:
      payload.releaseKind === "album_ep" && headAlbumTrack
        ? headAlbumTrack.isrc.trim() || "—"
        : f.isrc || "—",
    upc: f.upc || "—",
    updated: new Date().toISOString().slice(0, 10),
    artist: f.artistMain,
    storesSelected: selected,
    labelName: f.label || undefined,
    language: f.language,
    genreMain: f.genreMain,
    genreSub: f.genreSub,
    territories: f.territories,
    releaseDate: f.releaseDate,
    preorder: f.preorder,
    composer: f.composer || undefined,
    artistFeatured: f.artistFeatured || undefined,
    audioAssetUrl:
      payload.releaseKind === "album_ep" && headAlbumTrack
        ? headAlbumTrack.url.trim() || f.audioAssetUrl.trim() || undefined
        : f.audioAssetUrl.trim() || undefined,
    albumTracks:
      payload.releaseKind === "album_ep" && Array.isArray(f.albumTracks) && f.albumTracks.length > 0
        ? f.albumTracks.map((t) => ({
            audioAssetUrl: t.url.trim(),
            isrc: t.isrc.trim() || undefined,
            title: t.title.trim() || undefined,
            filename: t.filename.trim() || undefined,
          }))
        : undefined,
    coverAssetUrl: f.coverAssetUrl.trim() || undefined,
    pline: f.pline.trim() || undefined,
    cline: f.cline.trim() || undefined,
    version: f.version.trim() || undefined,
    qcFeedback: undefined,
  };
  return base ? { ...base, ...patch } : patch;
}

export function getCatalogItemById(id: string): CatalogItem | undefined {
  return getCatalog().find((x) => x.id === id);
}

/** Gửi lại sau từ chối / nháp — giữ id, đặt lại chờ QC. */
export function resubmitReleaseToQC(existingId: string, payload: SubmitReleaseToQCPayload): CatalogItem | null {
  const existing = getCatalog().find((x) => x.id === existingId);
  if (!existing) return null;
  const item = buildCatalogItemFromForm(existingId, payload, existing);
  upsertCatalogItem(item);
  if (typeof window !== "undefined") {
    void import("./catalog-sync").then((m) => m.pushReleaseToBackendAfterUpsert(item));
  }
  return item;
}

export function submitReleaseToQC(payload: SubmitReleaseToQCPayload): CatalogItem {
  const id = `r-${Date.now()}`;
  const item = buildCatalogItemFromForm(id, payload);
  upsertCatalogItem(item);
  if (typeof window !== "undefined") {
    void import("./catalog-sync").then((m) => m.pushReleaseToBackendAfterUpsert(item));
  }
  return item;
}

export function getActiveStoreOptions(): { id: string; name: string }[] {
  return getCmsStores().filter((s) => s.enabled);
}
