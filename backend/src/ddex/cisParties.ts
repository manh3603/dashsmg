import type { CisStoreKey } from "./cisStores.js";

function envId(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function envName(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v || fallback;
}

/** PADPIDA do đối tác cấp sau hợp đồng — điền trong backend/.env */
export function loadCisRecipients(): Record<CisStoreKey, { partyId: string; partyName: string }> {
  return {
    vk_music: {
      partyId: envId("DDEX_PARTY_VK_ID"),
      partyName: envName("DDEX_PARTY_VK_NAME", "VK Music"),
    },
    yandex_music: {
      partyId: envId("DDEX_PARTY_YANDEX_ID"),
      partyName: envName("DDEX_PARTY_YANDEX_NAME", "Yandex Music"),
    },
    zvuk: {
      partyId: envId("DDEX_PARTY_ZVUK_ID"),
      partyName: envName("DDEX_PARTY_ZVUK_NAME", "ZVUK"),
    },
    kion_music: {
      partyId: envId("DDEX_PARTY_KION_ID"),
      partyName: envName("DDEX_PARTY_KION_NAME", "Kion Music"),
    },
    zing_mp3: {
      partyId: envId("DDEX_PARTY_ZING_ID"),
      partyName: envName("DDEX_PARTY_ZING_NAME", "Zing MP3"),
    },
  };
}
