import { CIS_STORE_LABELS, type CisStoreId } from "@/lib/cis-stores";

export const CIS_AGGREGATOR_STORE_IDS: CisStoreId[] = ["vk_music", "yandex_music", "zvuk", "kion_music"];

export type SftpCredentials = {
  host: string;
  hostFallback?: string;
  port?: number;
  user: string;
  password: string;
  remoteDir?: string;
};

export function buildSftpTargetsJson(creds: SftpCredentials, label: string): string {
  const host = creds.host.trim();
  const user = creds.user.trim();
  const password = creds.password;
  if (!host || !user || !password) return "[]";
  const row: Record<string, string | number> = {
    host,
    port: creds.port ?? 22,
    user,
    password,
    remoteDir: (creds.remoteDir ?? "/").trim() || "/",
    label: label.trim() || "CIS SFTP",
  };
  if (creds.hostFallback?.trim()) row.hostFallback = creds.hostFallback.trim();
  return JSON.stringify([row], null, 2);
}

export function parseSftpCredentials(json?: string | null): SftpCredentials {
  const empty: SftpCredentials = { host: "", user: "", password: "" };
  if (!json?.trim()) return empty;
  try {
    const arr = JSON.parse(json) as unknown;
    const row = Array.isArray(arr) ? arr[0] : null;
    if (!row || typeof row !== "object") return empty;
    const o = row as Record<string, unknown>;
    return {
      host: String(o.host ?? ""),
      hostFallback: o.hostFallback != null ? String(o.hostFallback) : undefined,
      port: typeof o.port === "number" ? o.port : Number(o.port) || 22,
      user: String(o.user ?? ""),
      password: String(o.password ?? ""),
      remoteDir: o.remoteDir != null ? String(o.remoteDir) : "/",
    };
  } catch {
    return empty;
  }
}

export function dealDraftForCisStore(
  storeId: CisStoreId,
  creds: SftpCredentials,
  opts?: { contractRef?: string; notes?: string }
) {
  const meta = CIS_STORE_LABELS[storeId];
  return {
    partnerName: `${meta.name} (SP Digital)`,
    contractRef: opts?.contractRef?.trim() || "BlackOrchid",
    territory: "CIS",
    reportingStores: meta.name,
    deliveryCisStoreKeys: [storeId],
    deliverySftpTargetsJson: buildSftpTargetsJson(creds, `${meta.name} — SP Digital`),
    notes: opts?.notes?.trim() || `CIS store: ${storeId}. Shared SFTP per partner contract.`,
    status: "active" as const,
  };
}

export const SP_DIGITAL_SFTP_DEFAULTS = {
  host: "sftp1.sp-digital.ru",
  hostFallback: "195.46.167.154",
  port: 22,
  user: "BlackOrchid",
  remoteDir: "/",
  contractRef: "BlackOrchid",
};
