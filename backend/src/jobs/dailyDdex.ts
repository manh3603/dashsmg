import cron from "node-cron";
import type { CatalogItem, DdexBatchResult } from "../types.js";
import { listReleases, updateStatus } from "../store.js";
import { writeErnFile } from "../ddex/buildErn.js";
import { effectiveCisStoreSelection, writeCisDdexBundle } from "../ddex/cisBundle.js";
import { deliverCisRelease } from "../delivery/deliverRelease.js";
import { listSftpTargets } from "../delivery/sftpEnv.js";
import { pushLocalFilesToAllSftp, nextSftpPackageFolderName } from "../delivery/sftpPush.js";
import { defaultSenderPartyId } from "../ddex/soulDpid.js";
import { allocateNextBatchId } from "./batchIdAllocator.js";

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function envRequiredRecipient(): string {
  return process.env.DDEX_MESSAGE_RECIPIENT_PARTY_ID?.trim() ?? "";
}

function hasEffectiveCisSelection(item: CatalogItem): boolean {
  return effectiveCisStoreSelection(item).length > 0;
}

export async function runDdexBatchForPendingStores(): Promise<DdexBatchResult> {
  const senderPartyId = process.env.DDEX_MESSAGE_SENDER_PARTY_ID?.trim() || defaultSenderPartyId();
  const recipientPartyId = envRequiredRecipient();
  const outputDir = env("DDEX_OUTPUT_DIR", "./data/ddex-out");
  const autoDelivery = env("CIS_AUTO_DELIVERY", "false").toLowerCase() === "true";

  const toExport = listReleases().filter((r) => r.status === "pending_qc");

  const batchId = allocateNextBatchId();
  const files: DdexBatchResult["files"] = [];
  const releaseIds: string[] = [];
  const skipped: { releaseId: string; reason: string }[] = [];
  const cisDelivery: NonNullable<DdexBatchResult["cisDelivery"]> = [];
  const sftpDelivery: NonNullable<DdexBatchResult["sftpDelivery"]> = [];

  const sftpTargets = listSftpTargets();
  const sftpBatchFolder = sftpTargets.length ? nextSftpPackageFolderName() : "";

  for (const item of toExport) {
    const current = listReleases().find((x) => x.id === item.id) ?? item;

    if (hasEffectiveCisSelection(current)) {
      if (autoDelivery) {
        const d = await deliverCisRelease(current, {
          writeFiles: true,
          outputDir,
          sftpBatchFolder: sftpBatchFolder || undefined,
        });
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
        if (d.sftp) {
          for (const s of d.sftp) {
            sftpDelivery.push({
              releaseId: current.id,
              label: s.label,
              host: s.host,
              ok: s.ok,
              error: s.error,
            });
          }
        }
        if (!d.ok) {
          skipped.push({
            releaseId: current.id,
            reason: d.summary || "Gửi CIS (HTTP/SFTP) thất bại — kiểm tra CIS_DELIVERY_*_URL, SFTP và log đối tác",
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
      if (sftpTargets.length) {
        const sf = await pushLocalFilesToAllSftp(
          sftpTargets,
          current.id.replace(/[^a-zA-Z0-9_-]/g, "_"),
          bundle.files.map((f) => ({ path: f.path, filename: f.filename })),
          { batchFolder: sftpBatchFolder }
        );
        for (const s of sf) {
          sftpDelivery.push({
            releaseId: current.id,
            label: s.label,
            host: s.host,
            ok: s.ok,
            error: s.error,
          });
        }
        if (!sf.every((x) => x.ok)) {
          skipped.push({
            releaseId: current.id,
            reason: `SFTP lỗi: ${sf.filter((x) => !x.ok).map((x) => `${x.label}: ${x.error}`).join("; ")}`,
          });
          continue;
        }
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
      if (!recipientPartyId) {
        skipped.push({
          releaseId: current.id,
          reason: "Thiếu DDEX_MESSAGE_RECIPIENT_PARTY_ID — không xuất ERN mặc định.",
        });
        continue;
      }
      const full = writeErnFile(current, outputDir, { senderPartyId, recipientPartyId });
      const filename = full.split(/[/\\]/).pop() ?? full;
      if (sftpTargets.length) {
        const dirName = current.id.replace(/[^a-zA-Z0-9_-]/g, "_");
        const sf = await pushLocalFilesToAllSftp(
          sftpTargets,
          dirName,
          [{ path: full, filename }],
          { batchFolder: sftpBatchFolder }
        );
        for (const s of sf) {
          sftpDelivery.push({
            releaseId: current.id,
            label: s.label,
            host: s.host,
            ok: s.ok,
            error: s.error,
          });
        }
        if (!sf.every((x) => x.ok)) {
          skipped.push({
            releaseId: current.id,
            reason: `SFTP lỗi: ${sf.filter((x) => !x.ok).map((x) => `${x.label}: ${x.error}`).join("; ")}`,
          });
          continue;
        }
      }
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
    ...(sftpDelivery.length ? { sftpDelivery } : {}),
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
          const sf = r.sftpDelivery?.length ? ` sftp=${r.sftpDelivery.length}` : "";
          console.log(`[ddex-daily] ${r.at} batch=${r.batchId} exported=${r.files.length}${sk}${cd}${sf}`);
        } catch (e) {
          console.error("[ddex-daily] error", e);
        }
      })();
    },
    { timezone: process.env.DDEX_TZ || undefined }
  );
  console.log(`[ddex-daily] scheduled: ${cronExpr}`);
}
