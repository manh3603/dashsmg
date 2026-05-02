import type { CatalogItem } from "@/lib/smg-storage";
import {
  deleteReleaseOnBackend,
  fetchBackendReleases,
  isBackendConfigured,
  patchReleaseStatusOnBackend,
  postBulkReleasesToBackend,
  pushCatalogItemToBackend,
} from "@/lib/backend-api";
import { getCatalog, saveCatalog } from "@/lib/smg-storage";

/** Tránh mất bản chỉ có trên client (từ chối, nháp) khi server trả danh sách cũ hơn — gộp theo id, ưu tiên bản có `updated` mới hơn. */
function mergeCatalogRemoteWithLocal(remote: CatalogItem[], local: CatalogItem[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>();
  for (const r of remote) {
    map.set(r.id, { ...r });
  }
  for (const l of local) {
    const e = map.get(l.id);
    if (!e) {
      map.set(l.id, { ...l });
      continue;
    }
    if (l.updated > e.updated) {
      map.set(l.id, { ...e, ...l });
    } else if (e.updated > l.updated) {
      map.set(l.id, { ...l, ...e });
    } else {
      map.set(l.id, { ...e, ...l });
    }
  }
  return [...map.values()];
}

/**
 * Một nguồn dữ liệu khi có API: đồng bộ với server nhưng không xóa bản chỉ có trên client.
 * - Server + local → gộp theo id (updated mới hơn thắng).
 * - Server rỗng, local có → đẩy bulk một lần (migration).
 */
export async function syncCatalogWithBackend(): Promise<void> {
  if (!isBackendConfigured() || typeof window === "undefined") return;
  try {
    const remote = await fetchBackendReleases();
    const local = getCatalog();
    if (remote.length > 0) {
      saveCatalog(mergeCatalogRemoteWithLocal(remote, local));
      return;
    }
    if (local.length > 0) {
      const r = await postBulkReleasesToBackend(local);
      if (r.ok) {
        const again = await fetchBackendReleases();
        if (again.length > 0) saveCatalog(again);
      }
    }
  } catch {
    /* offline / lỗi mạng — giữ catalog local */
  }
}

export async function pushReleaseToBackendAfterUpsert(item: CatalogItem): Promise<void> {
  if (!isBackendConfigured()) return;
  const r = await pushCatalogItemToBackend(item);
  if (!r.ok) {
    console.warn("[catalog-sync] Không đẩy được release lên backend:", r.error);
  }
}

export async function pushStatusToBackendAfterLocalUpdate(id: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const item = getCatalog().find((x) => x.id === id);
  if (!item) return;
  const ok = await patchReleaseStatusOnBackend(id, item.status, item.qcFeedback ?? null);
  if (!ok) {
    console.warn("[catalog-sync] Không PATCH trạng thái lên backend:", id);
  }
}

export async function deleteReleaseOnBackendAfterLocalRemove(id: string): Promise<void> {
  if (!isBackendConfigured()) return;
  const ok = await deleteReleaseOnBackend(id);
  if (!ok) {
    console.warn("[catalog-sync] Không xóa release trên backend:", id);
  }
}
