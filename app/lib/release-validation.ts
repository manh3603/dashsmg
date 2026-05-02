/** Khớp lỏng với backend `validateCis.ts` */

export function isValidIsrc(s: string): boolean {
  const x = s.replace(/[-\s]/g, "");
  return x.length >= 12 && /^[A-Z0-9]+$/i.test(x);
}

export function isPlaceholderIsrc(s: string): boolean {
  const t = s.trim();
  return t === "" || t === "—" || t === "-";
}

export function isValidUpcGtin(s: string): boolean {
  const d = s.replace(/\s/g, "");
  return /^\d{12,13}$/.test(d);
}

export function isPlaceholderUpc(s: string): boolean {
  const t = s.trim();
  return t === "" || t === "—" || t === "-";
}
