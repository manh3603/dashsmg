/** Cửa hàng gửi DDEX (HTTP/SFTP + file) — id khớp backend `CisStoreKey`. */
export const CIS_STORE_IDS = ["vk_music", "yandex_music", "zvuk", "kion_music", "zing_mp3"] as const;

export type CisStoreId = (typeof CIS_STORE_IDS)[number];

export const CIS_STORE_LABELS: Record<CisStoreId, { name: string; hint: string }> = {
  vk_music: { name: "VK Music", hint: "Nga & CIS" },
  yandex_music: { name: "Yandex Music", hint: "Nga & CIS" },
  zvuk: { name: "ZVUK", hint: "Nga" },
  kion_music: { name: "Kion Music", hint: "Nga & CIS" },
  zing_mp3: { name: "Zing MP3", hint: "Việt Nam — CMS/endpoint từ đối tác" },
};

export function isCisStoreId(id: string): id is CisStoreId {
  return (CIS_STORE_IDS as readonly string[]).includes(id);
}
