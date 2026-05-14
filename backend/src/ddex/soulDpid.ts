/**
 * DPID Soul — hợp đồng: PA-DPIDA-2025070802-C (PartyId XML dùng bản không gạch theo chuẩn DDEX).
 * Ghi đè: DDEX_SOUL_DPID hoặc DDEX_MESSAGE_SENDER_PARTY_ID.
 */
export const SOUL_DPID_CONTRACT_LABEL = "PA-DPIDA-2025070802-C";
export const DEFAULT_SOUL_DPID_NORMALIZED = "PADPIDA2025070802C";

export function defaultSenderPartyId(): string {
  const custom = process.env.DDEX_SOUL_DPID?.trim();
  if (custom) return custom.replace(/-/g, "");
  const legacy = process.env.DDEX_MESSAGE_SENDER_PARTY_ID?.trim();
  if (legacy) return legacy.replace(/-/g, "");
  return DEFAULT_SOUL_DPID_NORMALIZED;
}
