import fs from "node:fs";
import path from "node:path";
import SftpClient from "ssh2-sftp-client";
import type { SftpTarget } from "./sftpEnv.js";

export type SftpFileUpload = {
  /** Nội dung UTF-8 */
  content: string;
  /** Đường dẫn tương đối trong gói (chỉ tên file hoặc thư mục con) */
  relativePath: string;
};

export type SftpPushRow = {
  label: string;
  host: string;
  ok: boolean;
  error?: string;
};

export function nextSftpPackageFolderName(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const p3 = (n: number) => String(n).padStart(3, "0");
  return (
    `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}` +
    `${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}${p3(d.getMilliseconds())}`
  );
}

async function ensureRemoteDir(sftp: SftpClient, remoteDir: string): Promise<void> {
  const parts = remoteDir.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur += `/${p}`;
    try {
      await sftp.mkdir(cur, true);
    } catch {
      /* có thể đã tồn tại */
    }
  }
}

/**
 * Đẩy các file XML (và marker BatchComplete) lên mọi host SFTP.
 * Cấu trúc: remoteDir / yyyyMMddHHmmssfff / productFolder / files…
 */
export async function pushDdexFilesToAllSftp(
  targets: SftpTarget[],
  productFolder: string,
  files: SftpFileUpload[],
  opts?: { batchFolder?: string }
): Promise<SftpPushRow[]> {
  if (!targets.length || !files.length) return [];

  const batch = opts?.batchFolder ?? nextSftpPackageFolderName();
  const safeProduct = productFolder.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "release";
  const results: SftpPushRow[] = [];

  for (const t of targets) {
    const label = t.label || t.host;
    const client = new SftpClient();
    try {
      await client.connect({
        host: t.host,
        port: t.port,
        username: t.user,
        password: t.password,
        readyTimeout: 20_000,
      });

      const root = path.posix.join(t.remoteDir.replace(/\/$/, ""), batch, safeProduct);
      await ensureRemoteDir(client, root);

      for (const f of files) {
        const rel = f.relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
        const dest = path.posix.join(root, rel);
        const parent = path.posix.dirname(dest);
        if (parent !== "." && parent !== "/") {
          await ensureRemoteDir(client, parent);
        }
        await client.put(Buffer.from(f.content, "utf8"), dest);
      }

      const markerName = `BatchComplete_${batch}.xml`;
      const markerPath = path.posix.join(path.posix.dirname(root), markerName);
      await client.put(Buffer.from("", "utf8"), markerPath);

      await client.end();
      results.push({ label, host: t.host, ok: true });
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ label, host: t.host, ok: false, error: msg });
    }
  }

  return results;
}

/** Đẩy file đã ghi sẵn trên đĩa (giữ tên file). */
export async function pushLocalFilesToAllSftp(
  targets: SftpTarget[],
  productFolder: string,
  localFiles: { path: string; filename: string }[],
  opts?: { batchFolder?: string }
): Promise<SftpPushRow[]> {
  const uploads: SftpFileUpload[] = localFiles.map((f) => ({
    relativePath: f.filename,
    content: fs.readFileSync(f.path, "utf8"),
  }));
  return pushDdexFilesToAllSftp(targets, productFolder, uploads, opts);
}
