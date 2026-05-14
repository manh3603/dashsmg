import type { CatalogItem } from "../types.js";

export type EffectiveSoundRecording = {
  audioAssetUrl: string;
  isrc: string;
  title: string;
};

function clean(s: string | undefined): string {
  return (s ?? "").trim();
}

/** Chuẩn hoá danh sách bản ghi âm cho ERN: album có `albumTracks` thì dùng; không thì một track từ release. */
export function getEffectiveSoundRecordings(item: CatalogItem): EffectiveSoundRecording[] {
  if (item.type === "Album/EP" && Array.isArray(item.albumTracks) && item.albumTracks.length > 0) {
    const out: EffectiveSoundRecording[] = [];
    let i = 0;
    for (const t of item.albumTracks) {
      i += 1;
      const audioAssetUrl = clean(t.audioAssetUrl);
      if (!/^https?:\/\//i.test(audioAssetUrl)) continue;
      const isrc = clean(t.isrc);
      const title = clean(t.title) || `${item.title} — Track ${i}`;
      out.push({ audioAssetUrl, isrc, title });
    }
    return out;
  }
  const audioAssetUrl = clean(item.audioAssetUrl);
  if (!/^https?:\/\//i.test(audioAssetUrl)) return [];
  return [
    {
      audioAssetUrl,
      isrc: clean(item.isrc),
      title: item.title,
    },
  ];
}
