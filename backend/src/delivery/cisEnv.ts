import type { CisStoreKey } from "../ddex/cisStores.js";

/** Khớp tiền tố biến môi trường CIS_DELIVERY_<PREFIX>_URL */
const STORE_ENV_PREFIX: Record<CisStoreKey, string> = {
  vk_music: "VK_MUSIC",
  yandex_music: "YANDEX_MUSIC",
  zvuk: "ZVUK",
  kion_music: "KION_MUSIC",
  zing_mp3: "ZING_MP3",
};

export type CisDeliveryHttpConfig = {
  url: string;
  headers: Record<string, string>;
  /** Gửi JSON { ern43Xml: string } thay vì raw XML — một số API partner yêu cầu */
  bodyMode: "xml" | "json";
};

function envTrim(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/**
 * Đọc cấu hình endpoint gửi DDEX cho một store.
 * Ví dụ VK Music:
 *   CIS_DELIVERY_VK_MUSIC_URL=https://partner.vk.com/.../ingest
 *   CIS_DELIVERY_VK_MUSIC_API_KEY=...
 *   CIS_DELIVERY_VK_MUSIC_AUTH_HEADER=X-Partner-Key   (tuỳ chọn; mặc định Bearer nếu có API_KEY)
 *   CIS_DELIVERY_VK_MUSIC_BODY_MODE=json              (tuỳ chọn; mặc định xml)
 */
export function getCisDeliveryConfig(storeKey: CisStoreKey): CisDeliveryHttpConfig | null {
  const prefix = STORE_ENV_PREFIX[storeKey];
  const url = envTrim(`CIS_DELIVERY_${prefix}_URL`);
  if (!url) return null;

  const apiKey = envTrim(`CIS_DELIVERY_${prefix}_API_KEY`);
  const authHeader = envTrim(`CIS_DELIVERY_${prefix}_AUTH_HEADER`);
  const bodyModeRaw = envTrim(`CIS_DELIVERY_${prefix}_BODY_MODE`);
  const bodyMode: "xml" | "json" = bodyModeRaw?.toLowerCase() === "json" ? "json" : "xml";

  const headers: Record<string, string> = {};
  if (apiKey) {
    if (authHeader) {
      headers[authHeader] = apiKey;
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  }

  return { url, headers, bodyMode };
}

const CIS_STORE_DISPLAY: Record<CisStoreKey, string> = {
  vk_music: "VK Music",
  yandex_music: "Yandex Music",
  zvuk: "ZVUK",
  kion_music: "Kion Music",
  zing_mp3: "Zing MP3",
};

export function cisStoreDisplayName(storeKey: CisStoreKey): string {
  return CIS_STORE_DISPLAY[storeKey] ?? storeKey;
}

export function listCisDeliveryConfigured(): { storeKey: CisStoreKey; hasEndpoint: boolean }[] {
  const keys: CisStoreKey[] = ["vk_music", "yandex_music", "zvuk", "kion_music", "zing_mp3"];
  return keys.map((storeKey) => ({
    storeKey,
    hasEndpoint: Boolean(getCisDeliveryConfig(storeKey)),
  }));
}
