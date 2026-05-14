/** GTIN-13 / EAN-13 check digit (GS1) — vị trí 1–12 từ trái: tổng chẵn lẻ 1× / 3×. */

export function ean13CheckDigitDigit12(first12: string): number {
  const d = first12.replace(/\D/g, "");
  if (d.length !== 12 || !/^\d{12}$/.test(d)) {
    throw new Error("EAN-13: cần đúng 12 chữ số (chưa kèm số kiểm).");
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = d.charCodeAt(i) - 48;
    sum += n * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function buildEan13From12(first12: string): string {
  return first12.replace(/\D/g, "") + String(ean13CheckDigitDigit12(first12));
}

/** Kiểm tra 13 chữ số (đủ check digit). */
export function isValidEan13(gtin: string): boolean {
  const d = gtin.replace(/\s/g, "");
  if (!/^\d{13}$/.test(d)) return false;
  const body = d.slice(0, 12);
  const check = d.charCodeAt(12) - 48;
  return ean13CheckDigitDigit12(body) === check;
}

/** Prefix VN 893 + Soul 274 + 6 số Item Reference + check → 13 ký tự. Item ref chạy 000001–999999. */
export const SOUL_UPC_PREFIX = "893274";

/** @param itemRef — 1…999999 (000001…999999 trong GTIN) */
export function buildSoulUpcFromItemRef(itemRef: number): string {
  if (!Number.isInteger(itemRef) || itemRef < 1 || itemRef > 999_999) {
    throw new Error("Item Reference UPC Soul phải từ 1 đến 999999 (000001…999999).");
  }
  const body12 = `${SOUL_UPC_PREFIX}${String(itemRef).padStart(6, "0")}`;
  return buildEan13From12(body12);
}
