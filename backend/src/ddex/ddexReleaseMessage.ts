import type { CatalogItem } from "../types.js";
import type { DdexMessageOpts } from "./ddexMessageOpts.js";
import { buildErn382NewReleaseMessage } from "./ern382Message.js";
import { buildErn43NewReleaseMessage } from "./ern43Message.js";

export type { DdexMessageOpts };

/** Mặc định ern/382 theo hướng dẫn tích hợp (3.82 ưu tiên). Đặt DDEX_ERN_VERSION=43 để giữ ERN 4.3. */
export function isErn43Mode(): boolean {
  const v = (process.env.DDEX_ERN_VERSION ?? "382").trim().toLowerCase();
  return v === "43" || v === "ern/43" || v === "4.3" || v === "ern43";
}

export function ddexErnFileSuffix(): "ern43" | "ern382" {
  return isErn43Mode() ? "ern43" : "ern382";
}

export function buildDdexNewReleaseMessage(item: CatalogItem, opts: DdexMessageOpts): string {
  return isErn43Mode() ? buildErn43NewReleaseMessage(item, opts) : buildErn382NewReleaseMessage(item, opts);
}
