import type { AccountRole } from "../types.js";

type Entry = {
  logins: string[];
  role: AccountRole;
  displayName: string;
  /** Biến môi trường bắt buộc — mật khẩu không nằm trong mã nguồn */
  envPasswordKey: string;
};

const ENTRIES: Entry[] = [
  {
    logins: ["admin", "admin@smg.local"],
    role: "platform_admin",
    displayName: "Quản trị nền tảng",
    envPasswordKey: "DEMO_AUTH_ADMIN_PASSWORD",
  },
  {
    logins: ["labeladmin", "label.admin@smg.local"],
    role: "customer_admin",
    displayName: "Admin khách hàng",
    envPasswordKey: "DEMO_AUTH_LABEL_PASSWORD",
  },
  {
    logins: ["artist", "artist@smg.local"],
    role: "artist",
    displayName: "Nghệ sĩ",
    envPasswordKey: "DEMO_AUTH_ARTIST_PASSWORD",
  },
];

function passwordFor(e: Entry): string {
  return process.env[e.envPasswordKey]?.trim() ?? "";
}

export type DemoLoginOk = {
  role: AccountRole;
  displayName: string;
  login: string;
};

export function tryDemoLogin(loginRaw: string, password: string): DemoLoginOk | null {
  const login = loginRaw.trim().toLowerCase();
  const pwd = password.trim();
  if (!login || !pwd) return null;
  for (const e of ENTRIES) {
    if (!e.logins.some((x) => x.toLowerCase() === login)) continue;
    const expected = passwordFor(e);
    if (!expected || expected !== pwd) return null;
    return {
      role: e.role,
      displayName: e.displayName,
      login: loginRaw.trim(),
    };
  }
  return null;
}

export type DemoAccountHint = {
  primaryLogin: string;
  aliases: string[];
  role: AccountRole;
  label: string;
};

export function listDemoAccountHints(): DemoAccountHint[] {
  return ENTRIES.map((e) => ({
    primaryLogin: e.logins[0],
    aliases: e.logins.slice(1),
    role: e.role,
    label: e.displayName,
  }));
}
