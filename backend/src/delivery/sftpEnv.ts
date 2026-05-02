/** SFTP đối tác — đặt trong backend/.env; job gửi file DDEX (triển khai ngoài UI). */

export function isSftpDeliveryConfigured(): boolean {
  const host = process.env.DDEX_SFTP_HOST?.trim();
  const user = process.env.DDEX_SFTP_USER?.trim();
  return Boolean(host && user);
}

export function sftpConfigPublic(): {
  configured: boolean;
  host?: string;
  port: number;
  remoteDir?: string;
} {
  const host = process.env.DDEX_SFTP_HOST?.trim();
  const port = Number(process.env.DDEX_SFTP_PORT || "22");
  return {
    configured: isSftpDeliveryConfigured(),
    host: host || undefined,
    port: Number.isFinite(port) ? port : 22,
    remoteDir: process.env.DDEX_SFTP_REMOTE_DIR?.trim() || undefined,
  };
}
