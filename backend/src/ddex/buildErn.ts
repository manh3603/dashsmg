import fs from "node:fs";
import path from "node:path";
import type { CatalogItem } from "../types.js";
import { buildDdexNewReleaseMessage, ddexErnFileSuffix } from "./ddexReleaseMessage.js";
import { territoryCodesForItem, validateCisExport } from "./validateCis.js";

/** Xuất một file ERN (recipient mặc định từ env) — dùng khi không tách theo từng DSP CIS */
export function writeErnFile(
  item: CatalogItem,
  outputDir: string,
  opts: {
    senderPartyId: string;
    recipientPartyId: string;
    senderName?: string;
    recipientName?: string;
  }
): string {
  const v = validateCisExport(item);
  if (!v.ok) {
    throw new Error(`DDEX validation: ${v.errors.join("; ")}`);
  }
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const safeName = `${item.id.replace(/[^a-zA-Z0-9_-]/g, "_")}_${ddexErnFileSuffix()}.xml`;
  const full = path.join(outputDir, safeName);
  const xml = buildDdexNewReleaseMessage(item, {
    senderPartyId: opts.senderPartyId,
    senderName: opts.senderName ?? process.env.DDEX_MESSAGE_SENDER_NAME ?? "SMG Distribution",
    recipientPartyId: opts.recipientPartyId,
    recipientName: opts.recipientName ?? process.env.DDEX_MESSAGE_RECIPIENT_NAME ?? "Aggregator",
    territoryCodes: territoryCodesForItem(item),
    deliveryTarget: "default_recipient",
  });
  fs.writeFileSync(full, xml, "utf8");
  return full;
}
