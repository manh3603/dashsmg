import fs from "node:fs";
import path from "node:path";
import type { CatalogItem } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const RELEASES_FILE = path.join(DATA_DIR, "releases.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): CatalogItem[] {
  ensureDataDir();
  if (!fs.existsSync(RELEASES_FILE)) return [];
  try {
    const raw = fs.readFileSync(RELEASES_FILE, "utf8");
    const parsed = JSON.parse(raw) as CatalogItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: CatalogItem[]) {
  ensureDataDir();
  fs.writeFileSync(RELEASES_FILE, JSON.stringify(items, null, 2), "utf8");
}

export function listReleases(): CatalogItem[] {
  return readAll();
}

export function getRelease(id: string): CatalogItem | undefined {
  return readAll().find((r) => r.id === id);
}

export function upsertRelease(item: CatalogItem): CatalogItem {
  const all = readAll();
  const i = all.findIndex((x) => x.id === item.id);
  if (i >= 0) all[i] = item;
  else all.unshift(item);
  writeAll(all);
  return item;
}

export function bulkUpsert(items: CatalogItem[]): { inserted: number; updated: number } {
  const all = readAll();
  const byId = new Map(all.map((x) => [x.id, x] as const));
  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    if (byId.has(item.id)) {
      byId.set(item.id, item);
      updated++;
    } else {
      byId.set(item.id, item);
      inserted++;
    }
  }
  writeAll([...byId.values()]);
  return { inserted, updated };
}

export function updateStatus(id: string, status: CatalogItem["status"]): CatalogItem | undefined {
  const all = readAll();
  const i = all.findIndex((x) => x.id === id);
  if (i < 0) return undefined;
  all[i] = {
    ...all[i],
    status,
    updated: new Date().toISOString().slice(0, 10),
  };
  writeAll(all);
  return all[i];
}

/** Cập nhật một phần bản ghi (trạng thái, qcFeedback, …). */
export function patchRelease(id: string, patch: Partial<CatalogItem>): CatalogItem | undefined {
  const all = readAll();
  const i = all.findIndex((x) => x.id === id);
  if (i < 0) return undefined;
  all[i] = {
    ...all[i],
    ...patch,
    id: all[i].id,
    updated: new Date().toISOString().slice(0, 10),
  };
  writeAll(all);
  return all[i];
}

export function removeRelease(id: string): boolean {
  const all = readAll();
  const next = all.filter((x) => x.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}
