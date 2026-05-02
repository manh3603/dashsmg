export const CIS_STORE_KEYS = ["vk_music", "yandex_music", "zvuk", "kion_music", "zing_mp3"] as const;
export type CisStoreKey = (typeof CIS_STORE_KEYS)[number];

export function isCisStoreKey(s: string): s is CisStoreKey {
  return (CIS_STORE_KEYS as readonly string[]).includes(s);
}
