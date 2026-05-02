import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import type { Response } from "express";
import type { CatalogItem } from "../types.js";
import { buildDdexNewReleaseMessage, ddexErnFileSuffix } from "./ddexReleaseMessage.js";
import { loadCisRecipients } from "./cisParties.js";
import { isCisStoreKey, type CisStoreKey } from "./cisStores.js";
import { territoryCodesForItem, validateCisExport } from "./validateCis.js";

export type CisBundleFile = { storeKey: string; filename: string; path: string };
export type CisXmlPayload = { storeKey: CisStoreKey; filename: string; xml: string };

function sender(): { partyId: string; name: string } {
  return {
    partyId: process.env.DDEX_MESSAGE_SENDER_PARTY_ID?.trim() ?? "",
    name: process.env.DDEX_MESSAGE_SENDER_NAME?.trim() || "SMG Distribution",
  };
}

/** Sinh XML ERN 4.3 cho từng cửa hàng CIS (không ghi đĩa) — dùng cho ZIP, gửi API, v.v. */
export function buildCisDdexPayloads(
  item: CatalogItem
): { ok: true; dirName: string; payloads: CisXmlPayload[] } | { ok: false; errors: string[] } {
  const v = validateCisExport(item);
  if (!v.ok) return v;

  const selected = (item.storesSelected ?? []).filter(isCisStoreKey);
  if (!selected.length) {
    return {
      ok: false,
      errors: ["Chưa chọn cửa hàng DDEX nào (vk_music, yandex_music, zvuk, kion_music, zing_mp3)."],
    };
  }

  const recipients = loadCisRecipients();
  const territories = territoryCodesForItem(item);
  const s = sender();
  if (!s.partyId) {
    return {
      ok: false,
      errors: ["Thiếu DDEX_MESSAGE_SENDER_PARTY_ID trong backend/.env — bắt buộc để sinh ERN CIS."],
    };
  }
  const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const payloads: CisXmlPayload[] = [];

  for (const storeKey of selected) {
    const rec = recipients[storeKey];
    if (!rec.partyId?.trim()) {
      return {
        ok: false,
        errors: [
          `Thiếu mã đối tác (PADPIDA) cho cửa hàng «${storeKey}» — đặt biến DDEX_PARTY_*_ID tương ứng trong backend/.env.`,
        ],
      };
    }
    const xml = buildDdexNewReleaseMessage(item, {
      senderPartyId: s.partyId,
      senderName: s.name,
      recipientPartyId: rec.partyId,
      recipientName: rec.partyName,
      territoryCodes: territories,
      deliveryTarget: storeKey,
    });
    const filename = `${storeKey}_${ddexErnFileSuffix()}_${safeId}.xml`;
    payloads.push({ storeKey, filename, xml });
  }

  return { ok: true, dirName: safeId, payloads };
}

export function writeCisDdexBundle(
  item: CatalogItem,
  baseOutDir: string
): { ok: true; dir: string; files: CisBundleFile[] } | { ok: false; errors: string[] } {
  const built = buildCisDdexPayloads(item);
  if (!built.ok) return built;

  const dir = path.join(baseOutDir, "cis", built.dirName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const files: CisBundleFile[] = [];
  for (const p of built.payloads) {
    const full = path.join(dir, p.filename);
    fs.writeFileSync(full, p.xml, "utf8");
    files.push({ storeKey: p.storeKey, filename: p.filename, path: full });
  }

  return { ok: true, dir, files };
}

export async function streamCisZipToResponse(
  item: CatalogItem,
  baseOutDir: string,
  res: Response
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const bundle = writeCisDdexBundle(item, baseOutDir);
  if (!bundle.ok) return bundle;

  const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeId}_cis_ddex.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err: Error) => {
    if (!res.headersSent) res.status(500).end(err.message);
  });
  archive.pipe(res);

  for (const f of bundle.files) {
    archive.file(f.path, { name: `${f.storeKey}/${f.filename}` });
  }
  await archive.finalize();
  return { ok: true };
}
