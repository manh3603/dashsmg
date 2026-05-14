/** Khớp lỏng với backend `validateCis.ts` */

export function isValidIsrc(s: string): boolean {
  const x = s.replace(/[-\s]/g, "");
  return x.length >= 12 && /^[A-Z0-9]+$/i.test(x);
}

export function isPlaceholderIsrc(s: string): boolean {
  const t = s.trim();
  return t === "" || t === "—" || t === "-";
}

/** Check digit EAN-13 / GTIN-13 (GS1). */
export function ean13CheckDigitFor12(first12: string): number {
  const d = first12.replace(/\D/g, "");
  if (d.length !== 12) return -1;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = d.charCodeAt(i) - 48;
    sum += n * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13Gtin(s: string): boolean {
  const d = s.replace(/\s/g, "");
  if (!/^\d{13}$/.test(d)) return false;
  return ean13CheckDigitFor12(d.slice(0, 12)) === d.charCodeAt(12) - 48;
}

export function isValidUpcGtin(s: string): boolean {
  const d = s.replace(/\s/g, "");
  if (/^\d{12}$/.test(d)) return true;
  if (/^\d{13}$/.test(d)) return isValidEan13Gtin(d);
  return false;
}

export function isPlaceholderUpc(s: string): boolean {
  const t = s.trim();
  return t === "" || t === "—" || t === "-";
}
