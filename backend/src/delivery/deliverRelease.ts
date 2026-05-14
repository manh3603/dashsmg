import type { CatalogItem } from "../types.js";
import type { CisBundleFile } from "../ddex/cisBundle.js";
import { buildCisDdexPayloads, writeCisDdexBundle } from "../ddex/cisBundle.js";
import { getCisDeliveryConfig } from "./cisEnv.js";
import { pushDdexToPartner } from "./pushXml.js";
import { listSftpTargets } from "./sftpEnv.js";
import { pushDdexFilesToAllSftp, type SftpPushRow } from "./sftpPush.js";

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
  /** Đẩy lên mọi host SFTP đã cấu hình */
  sftp?: SftpPushRow[];
};

/**
 * Ghi file ERN (tuỳ chọn) rồi POST XML/JSON lên từng endpoint đã cấu hình.
 * Store không có CIS_DELIVERY_*_URL: bỏ qua gửi (coi là giao thủ công / chỉ file).
 * Store có URL: bắt buộc HTTP 2xx mới tính là thành công.
 * SFTP: mọi host trong DDEX_SFTP_TARGETS / DDEX_SFTP_* nhận cùng bộ XML (gói DDEX).
 */
export async function deliverCisRelease(
  item: CatalogItem,
  opts: { writeFiles: boolean; outputDir: string; sftpBatchFolder?: string }
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

  const targets = listSftpTargets();
  let sftp: SftpPushRow[] | undefined;
  if (targets.length) {
    const uploads = built.payloads.map((p) => ({
      relativePath: p.filename,
      content: p.xml,
    }));
    sftp = await pushDdexFilesToAllSftp(targets, built.dirName, uploads, {
      batchFolder: opts.sftpBatchFolder,
    });
  }

  const required = results.filter((x) => !x.skipped);
  let ok = required.length === 0 || required.every((x) => x.pushed);
  if (sftp?.length && !sftp.every((x) => x.ok)) ok = false;

  const failed = required.filter((x) => !x.pushed);
  const sftpFailed = sftp?.filter((x) => !x.ok) ?? [];
  const parts: string[] = [];
  if (failed.length) parts.push(failed.map((f) => `${f.storeKey}: ${f.error || "HTTP lỗi"}`).join("; "));
  if (sftpFailed.length) parts.push(sftpFailed.map((f) => `${f.label}: ${f.error || "SFTP lỗi"}`).join("; "));
  const summary = !ok && parts.length ? parts.join(" | ") : undefined;

  return { ok, results, files, summary, sftp };
}
