import cron from "node-cron";
import type { DdexBatchResult } from "../types.js";
import { listReleases, updateStatus } from "../store.js";
import { writeErnFile } from "../ddex/buildErn.js";
import { writeCisDdexBundle } from "../ddex/cisBundle.js";
import { isCisStoreKey } from "../ddex/cisStores.js";
import { deliverCisRelease } from "../delivery/deliverRelease.js";

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function envRequiredParty(name: string): string {
  const v = process.env[name];
  return v?.trim() ?? "";
}

function hasCisSelection(stores?: string[]): boolean {
  return Boolean(stores?.some((s) => isCisStoreKey(s)));
}

export async function runDdexBatchForPendingStores(): Promise<DdexBatchResult> {
  const senderPartyId = envRequiredParty("DDEX_MESSAGE_SENDER_PARTY_ID");
  const recipientPartyId = envRequiredParty("DDEX_MESSAGE_RECIPIENT_PARTY_ID");
  const outputDir = env("DDEX_OUTPUT_DIR", "./data/ddex-out");
  const autoDelivery = env("CIS_AUTO_DELIVERY", "false").toLowerCase() === "true";

  const toExport = listReleases().filter((r) => r.status === "pending_qc");

  const batchId = `batch_${Date.now()}`;
  const files: DdexBatchResult["files"] = [];
  const releaseIds: string[] = [];
  const skipped: { releaseId: string; reason: string }[] = [];
  const cisDelivery: NonNullable<DdexBatchResult["cisDelivery"]> = [];

  for (const item of toExport) {
    const current = listReleases().find((x) => x.id === item.id) ?? item;

    if (hasCisSelection(current.storesSelected)) {
      if (autoDelivery) {
        const d = await deliverCisRelease(current, { writeFiles: true, outputDir });
        for (const r of d.results) {
          cisDelivery.push({
            releaseId: current.id,
            storeKey: r.storeKey,
            pushed: r.pushed,
            skipped: r.skipped,
            httpStatus: r.httpStatus,
            error: r.error,
          });
        }
        if (!d.ok) {
          skipped.push({
            releaseId: current.id,
            reason: d.summary || "Gửi CIS (HTTP) thất bại — kiểm tra CIS_DELIVERY_*_URL và log đối tác",
          });
          continue;
        }
        updateStatus(current.id, "sent_to_stores");
        for (const f of d.files ?? []) {
          files.push({
            releaseId: current.id,
            filename: f.filename,
            path: f.path,
            storeKey: f.storeKey,
          });
        }
        releaseIds.push(current.id);
        continue;
      }

      const bundle = writeCisDdexBundle(current, outputDir);
      if (!bundle.ok) {
        skipped.push({ releaseId: current.id, reason: bundle.errors.join("; ") });
        continue;
      }
      updateStatus(current.id, "sent_to_stores");
      for (const f of bundle.files) {
        files.push({
          releaseId: current.id,
          filename: f.filename,
          path: f.path,
          storeKey: f.storeKey,
        });
      }
      releaseIds.push(current.id);
      continue;
    }

    try {
      const full = writeErnFile(current, outputDir, { senderPartyId, recipientPartyId });
      const filename = full.split(/[/\\]/).pop() ?? full;
      updateStatus(current.id, "sent_to_stores");
      files.push({ releaseId: current.id, filename, path: full });
      releaseIds.push(current.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      skipped.push({ releaseId: current.id, reason: msg });
    }
  }

  return {
    batchId,
    at: new Date().toISOString(),
    releaseIds,
    files,
    ...(skipped.length ? { skipped } : {}),
    ...(cisDelivery.length ? { cisDelivery } : {}),
  };
}

export function scheduleDailyDdex(cronExpr: string): void {
  cron.schedule(
    cronExpr,
    () => {
      void (async () => {
        try {
          const r = await runDdexBatchForPendingStores();
          const sk = r.skipped?.length ? ` skipped=${r.skipped.length}` : "";
          const cd = r.cisDelivery?.length ? ` cisPush=${r.cisDelivery.length}` : "";
          console.log(`[ddex-daily] ${r.at} batch=${r.batchId} exported=${r.files.length}${sk}${cd}`);
        } catch (e) {
          console.error("[ddex-daily] error", e);
        }
      })();
    },
    { timezone: process.env.DDEX_TZ || undefined }
  );
  console.log(`[ddex-daily] scheduled: ${cronExpr}`);
}
