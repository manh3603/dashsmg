import type { CatalogItem } from "../types.js";
import { isValidEan13 } from "../metadata/ean13.js";

export type CisValidation = { ok: true } | { ok: false; errors: string[] };

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function isPlaceholderUpc(u: string): boolean {
  return u === "" || u === "—" || u === "-";
}

function isPlaceholderIsrc(i: string): boolean {
  return i === "" || i === "—" || i === "-";
}

/** UPC/EAN-13: 12–13 chữ số (cho phép có khoảng trắng) */
function normalizeGtin(s: string): string {
  return s.replace(/\s/g, "");
}

function isLikelyGtin13(s: string): boolean {
  const d = normalizeGtin(s);
  return /^\d{12}$/.test(d) || /^\d{13}$/.test(d);
}

/** ISRC: 12 ký tự theo mẫu quốc tế (lỏng) */
function isLikelyIsrc(s: string): boolean {
  const x = s.replace(/[-\s]/g, "");
  return x.length >= 12 && /^[A-Z0-9]+$/i.test(x);
}

function validateUpcField(label: string, upcRaw: string, errors: string[]) {
  if (!isLikelyGtin13(clean(upcRaw)) || isPlaceholderUpc(clean(upcRaw))) {
    errors.push(`${label}: cần UPC/GTIN-13 (12–13 chữ số).`);
    return;
  }
  const g = normalizeGtin(clean(upcRaw));
  if (/^\d{13}$/.test(g) && !isValidEan13(g)) {
    errors.push(`${label}: UPC 13 chữ số không đúng số kiểm EAN-13 (check digit).`);
  }
}

export function validateCisExport(item: CatalogItem): CisValidation {
  const errors: string[] = [];
  const rd = clean(item.releaseDate);

  if (!rd) errors.push("Thiếu ngày phát hành (releaseDate) — bắt buộc cho Deal / ValidityPeriod.");

  if (item.type === "Single") {
    if (!isLikelyIsrc(clean(item.isrc)) || isPlaceholderIsrc(clean(item.isrc))) {
      errors.push("Single: cần ISRC hợp lệ (12 ký tự, ví dụ CC-XXX-YY-NNNNN).");
    }
    validateUpcField("Single", item.upc ?? "", errors);
  } else {
    validateUpcField("Album/EP", item.upc ?? "", errors);
  }

  const tracks = Array.isArray(item.albumTracks) ? item.albumTracks : [];
  if (item.type === "Album/EP" && tracks.length > 0) {
    tracks.forEach((t, idx) => {
      const n = idx + 1;
      const u = clean(t.audioAssetUrl);
      if (!u || !/^https?:\/\//i.test(u)) {
        errors.push(`Album track ${n}: cần URL file âm thanh https://.`);
      }
      if (!isLikelyIsrc(clean(t.isrc ?? "")) || isPlaceholderIsrc(clean(t.isrc ?? ""))) {
        errors.push(`Album track ${n}: cần ISRC hợp lệ (mỗi track một ISRC).`);
      }
    });
  } else {
    const audio = clean(item.audioAssetUrl);
    if (!audio || !/^https?:\/\//i.test(audio)) {
      errors.push("Cần URL file âm thanh (audioAssetUrl) dạng https:// — DSP/aggregator dùng trong TechnicalSoundRecordingDetails.");
    }
  }

  const artist = clean(item.artist);
  if (!artist) errors.push("Thiếu nghệ sĩ chính (artist).");

  if (!clean(item.title)) errors.push("Thiếu tiêu đề (title).");

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function territoryCodesForItem(item: CatalogItem): string[] {
  const t = item.territories?.toLowerCase() ?? "worldwide";
  if (t === "cis" || t === "ru_cis") {
    return ["RU", "BY", "KZ", "AM", "AZ", "KG", "MD", "TJ", "TM", "UZ"];
  }
  if (t === "vn") return ["VN"];
  if (t === "sea") return ["VN", "TH", "ID", "MY", "SG", "PH"];
  if (t === "worldwide") return ["Worldwide"];
  return ["Worldwide"];
}
