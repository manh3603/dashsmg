/** SFTP đối tác — env + deal đang active (JSON mảng). */

import { listDeals } from "../dealsStore.js";

export type SftpTarget = {
  host: string;
  port: number;
  user: string;
  password: string;
  remoteDir: string;
  /** Hiển thị log / API công khai, không bắt buộc */
  label?: string;
};

function trim(v: string | undefined): string {
  return v?.trim() ?? "";
}

/** Parse JSON mảng cùng định dạng `DDEX_SFTP_TARGETS`. */
export function parseSftpTargetsJson(raw: string): SftpTarget[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  const out: SftpTarget[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const host = trim(String(o.host ?? ""));
    const user = trim(String(o.user ?? o.username ?? ""));
    const password = trim(String(o.password ?? ""));
    if (!host || !user || !password) continue;
    const port = Number(o.port ?? 22);
    const remoteDir = trim(String(o.remoteDir ?? o.remotePath ?? "/incoming")) || "/incoming";
    const label = trim(String(o.label ?? ""));
    out.push({
      host,
      port: Number.isFinite(port) && port > 0 ? port : 22,
      user,
      password,
      remoteDir,
      ...(label ? { label } : {}),
    });
  }
  return out;
}

function dedupeTargets(list: SftpTarget[]): SftpTarget[] {
  const seen = new Set<string>();
  const out: SftpTarget[] = [];
  for (const t of list) {
    const k = `${t.host}:${t.port}:${t.user}:${t.remoteDir}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function listSftpTargetsFromEnvOnly(): SftpTarget[] {
  const json = trim(process.env.DDEX_SFTP_TARGETS);
  if (json) {
    try {
      const list = parseSftpTargetsJson(json);
      if (list.length) return list;
    } catch {
      /* fall through */
    }
  }

  const host = trim(process.env.DDEX_SFTP_HOST);
  const user = trim(process.env.DDEX_SFTP_USER);
  const password = trim(process.env.DDEX_SFTP_PASSWORD);
  if (host && user && password) {
    const port = Number(process.env.DDEX_SFTP_PORT || "22");
    const remoteDir = trim(process.env.DDEX_SFTP_REMOTE_DIR) || "/incoming";
    return [
      {
        host,
        port: Number.isFinite(port) && port > 0 ? port : 22,
        user,
        password,
        remoteDir,
        label: trim(process.env.DDEX_SFTP_LABEL) || undefined,
      },
    ];
  }

  return [];
}

/** SFTP từ các deal trạng thái active (trường deliverySftpTargetsJson). */
function listSftpTargetsFromActiveDeals(): SftpTarget[] {
  const out: SftpTarget[] = [];
  for (const d of listDeals()) {
    if (d.status !== "active") continue;
    const raw = d.deliverySftpTargetsJson?.trim();
    if (!raw) continue;
    try {
      const part = parseSftpTargetsJson(raw);
      for (const t of part) {
        out.push({
          ...t,
          label: t.label || d.partnerName,
        });
      }
    } catch {
      /* bỏ qua JSON lỗi */
    }
  }
  return out;
}

/** Hợp nhất env + deal (ưu tiên không trùng host/port/user/remoteDir). */
export function listSftpTargets(): SftpTarget[] {
  return dedupeTargets([...listSftpTargetsFromEnvOnly(), ...listSftpTargetsFromActiveDeals()]);
}

export function isSftpDeliveryConfigured(): boolean {
  return listSftpTargets().length > 0;
}

export function sftpConfigPublic(): {
  configured: boolean;
  targetCount: number;
  targets: { host: string; port: number; remoteDir: string; label?: string }[];
} {
  const targets = listSftpTargets();
  return {
    configured: targets.length > 0,
    targetCount: targets.length,
    targets: targets.map((t) => ({
      host: t.host,
      port: t.port,
      remoteDir: t.remoteDir,
      ...(t.label ? { label: t.label } : {}),
    })),
  };
}
