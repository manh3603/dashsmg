import type { CatalogItem } from "../types.js";
import type { CisBundleFile } from "../ddex/cisBundle.js";
import { buildCisDdexPayloads, writeCisDdexBundle } from "../ddex/cisBundle.js";
import { getCisDeliveryConfig } from "./cisEnv.js";
import { pushDdexToPartner } from "./pushXml.js";

export type CisDeliveryResultRow = {
  storeKey: string;
  pushed: boolean;
  skipped?: boolean;
  httpStatus?: number;
  error?: string;
};

export type DeliverCisReleaseOutcome = {
  ok: boolean;
  results: CisDeliveryResultRow[];
  /** File đã ghi (khi writeFiles) */
  files?: CisBundleFile[];
  /** Lý do tổng thể nếu ok === false */
  summary?: string;
};

/**
 * Ghi file ERN (tuỳ chọn) rồi POST XML/JSON lên từng endpoint đã cấu hình.
 * Store không có CIS_DELIVERY_*_URL: bỏ qua gửi (coi là giao thủ công / chỉ file).
 * Store có URL: bắt buộc HTTP 2xx mới tính là thành công.
 */
export async function deliverCisRelease(
  item: CatalogItem,
  opts: { writeFiles: boolean; outputDir: string }
): Promise<DeliverCisReleaseOutcome> {
  const built = buildCisDdexPayloads(item);
  if (!built.ok) {
    return {
      ok: false,
      results: [],
      summary: built.errors.join("; "),
    };
  }

  let files: CisBundleFile[] | undefined;
  if (opts.writeFiles) {
    const w = writeCisDdexBundle(item, opts.outputDir);
    if (!w.ok) {
      return { ok: false, results: [], summary: w.errors.join("; ") };
    }
    files = w.files;
  }

  const results: CisDeliveryResultRow[] = [];
  for (const p of built.payloads) {
    const cfg = getCisDeliveryConfig(p.storeKey);
    if (!cfg) {
      results.push({ storeKey: p.storeKey, pushed: false, skipped: true });
      continue;
    }

    const r = await pushDdexToPartner(cfg.url, p.xml, cfg.headers, cfg.bodyMode);
    if (r.ok) {
      results.push({ storeKey: p.storeKey, pushed: true, httpStatus: r.status });
    } else {
      results.push({
        storeKey: p.storeKey,
        pushed: false,
        httpStatus: r.status,
        error: r.error,
      });
    }
  }

  const required = results.filter((x) => !x.skipped);
  const ok = required.length === 0 || required.every((x) => x.pushed);
  const failed = required.filter((x) => !x.pushed);
  const summary =
    !ok && failed.length
      ? failed.map((f) => `${f.storeKey}: ${f.error || "HTTP lỗi"}`).join("; ")
      : undefined;

  return { ok, results, files, summary };
}
