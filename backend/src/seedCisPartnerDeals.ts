import { CIS_AGGREGATOR_STORE_IDS } from "./cisStoreIds.js";
import { listDeals, upsertDeal } from "./dealsStore.js";

const STORE_NAMES: Record<string, string> = {
  vk_music: "VK Music",
  yandex_music: "Yandex Music",
  zvuk: "ZVUK",
  kion_music: "Kion Music",
};

/** Tạo 4 deal CIS (mỗi CH một deal) nếu chưa có — dùng biến môi trường, không hardcode mật khẩu trong mã. */
export function ensureCisPartnerDealsSeeded(): number {
  const password = process.env.PARTNER_SFTP_SEED_PASSWORD?.trim();
  if (!password) return 0;

  const host = process.env.PARTNER_SFTP_SEED_HOST?.trim() || "sftp1.sp-digital.ru";
  const hostFallback = process.env.PARTNER_SFTP_SEED_HOST_FALLBACK?.trim() || "195.46.167.154";
  const user = process.env.PARTNER_SFTP_SEED_USER?.trim() || "BlackOrchid";
  const port = Number(process.env.PARTNER_SFTP_SEED_PORT || 22) || 22;
  const remoteDir = process.env.PARTNER_SFTP_SEED_REMOTE_DIR?.trim() || "/";

  const existing = new Set(listDeals().map((d) => d.id));
  let created = 0;

  for (const storeId of CIS_AGGREGATOR_STORE_IDS) {
    const id = `cis-${storeId}`;
    if (existing.has(id)) continue;

    const label = STORE_NAMES[storeId] ?? storeId;
    const sftpJson = JSON.stringify([
      {
        host,
        hostFallback,
        port,
        user,
        password,
        remoteDir,
        label: `${label} — SP Digital`,
      },
    ]);

    const r = upsertDeal({
      id,
      partnerName: `${label} (SP Digital)`,
      contractRef: "BlackOrchid",
      territory: "CIS",
      reportingStores: label,
      deliveryCisStoreKeys: [storeId],
      deliverySftpTargetsJson: sftpJson,
      notes:
        "Auto-seeded CIS deal. Partner ready for first test package (2–3 products). Shared SFTP inbox per store deal.",
      status: "active",
    });
    if (r.ok) created++;
  }

  return created;
}
