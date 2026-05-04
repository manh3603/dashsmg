import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DEALS_FILE = path.join(DATA_DIR, "partner-deals.json");

export type PartnerDealStatus = "draft" | "active" | "archived";

export type PartnerDeal = {
  id: string;
  partnerName: string;
  contractRef?: string;
  territory?: string;
  /** Mô tả chia sẻ doanh thu / phí, ví dụ «85% net cho nghệ sĩ» */
  revenueTerms?: string;
  validFrom?: string;
  validTo?: string;
  contactEmail?: string;
  notes?: string;
  /** Danh sách cửa hàng / kênh báo cáo gắn deal (CSV, ví dụ: Zing MP3, Spotify aggregator) — dùng cho pipeline phân tích đa nguồn. */
  reportingStores?: string;
  status: PartnerDealStatus;
  createdAt: string;
  updatedAt: string;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): PartnerDeal[] {
  ensureDataDir();
  if (!fs.existsSync(DEALS_FILE)) return [];
  try {
    const raw = fs.readFileSync(DEALS_FILE, "utf8");
    const parsed = JSON.parse(raw) as PartnerDeal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PartnerDeal[]) {
  ensureDataDir();
  fs.writeFileSync(DEALS_FILE, JSON.stringify(items, null, 2), "utf8");
}

export function listDeals(): PartnerDeal[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertDeal(input: {
  id?: string;
  partnerName: string;
  contractRef?: string;
  territory?: string;
  revenueTerms?: string;
  validFrom?: string;
  validTo?: string;
  contactEmail?: string;
  notes?: string;
  reportingStores?: string;
  status?: PartnerDealStatus;
}): { ok: true; deal: PartnerDeal } | { ok: false; error: string } {
  const name = input.partnerName?.trim();
  if (!name) return { ok: false, error: "Thiếu tên đối tác." };
  const all = readAll();
  const now = new Date().toISOString();
  const id = input.id?.trim() || randomUUID();
  const i = all.findIndex((d) => d.id === id);
  const status: PartnerDealStatus =
    input.status === "draft" || input.status === "active" || input.status === "archived" ? input.status : "draft";

  const prev = i >= 0 ? all[i]! : undefined;
  const row: PartnerDeal = {
    id,
    partnerName: name,
    contractRef: input.contractRef?.trim() || undefined,
    territory: input.territory?.trim() || undefined,
    revenueTerms: input.revenueTerms?.trim() || undefined,
    validFrom: input.validFrom?.trim() || undefined,
    validTo: input.validTo?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    reportingStores:
      input.reportingStores !== undefined
        ? input.reportingStores.trim() || undefined
        : prev?.reportingStores,
    status,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  if (i >= 0) all[i] = row;
  else all.unshift(row);
  writeAll(all);
  return { ok: true, deal: row };
}

export function deleteDeal(id: string): { ok: true } | { ok: false; error: string } {
  const k = id.trim();
  const all = readAll();
  const next = all.filter((d) => d.id !== k);
  if (next.length === all.length) return { ok: false, error: "Không tìm thấy deal." };
  writeAll(next);
  return { ok: true };
}
