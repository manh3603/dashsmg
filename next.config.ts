import type { NextConfig } from "next";

/**
 * Next 16 chặn /_next/* khi Origin là IP LAN — thêm pattern RFC1918 để HMR & bundle load được qua 192.168.x / 10.x / 172.16–31.x.
 * Thêm host tuỳ chọn: ALLOWED_DEV_ORIGINS=host1,host2 (không gồm cổng).
 */
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const lanDevOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  ...extraDevOrigins,
];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins,
};

export default nextConfig;
