/** Email hỗ trợ Soul Music Asia — vé kỹ thuật & bản quyền. */
export const SUPPORT_EMAIL = "Info@soulmusic.asia";

export function mailtoSupport(subject: string, body?: string): string {
  const q = new URLSearchParams({ subject });
  if (body?.trim()) q.set("body", body.trim());
  return `mailto:${SUPPORT_EMAIL}?${q.toString()}`;
}
