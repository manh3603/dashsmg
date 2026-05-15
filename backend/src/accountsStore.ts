import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { AccountRole } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

export type StoredAccount = {
  id: string;
  /** Tên đăng nhập hiển thị (thường là email). So khớp không phân biệt hoa thường. */
  login: string;
  passwordHash: string;
  role: AccountRole;
  displayName: string;
  orgLabel?: string;
  /** Login admin nhãn đã tạo tài khoản nghệ sĩ con. */
  managedByLogin?: string;
  royaltySharePercent?: number;
  createdAt: string;
  updatedAt: string;
};

export type StoredAccountPublic = Omit<StoredAccount, "passwordHash">;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function normalizeLoginKey(s: string): string {
  return s.trim().toLowerCase();
}

export function readAccounts(): StoredAccount[] {
  ensureDataDir();
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(items: StoredAccount[]) {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(items, null, 2), "utf8");
}

export function findStoredAccount(loginRaw: string): StoredAccount | undefined {
  const k = normalizeLoginKey(loginRaw);
  return readAccounts().find((a) => normalizeLoginKey(a.login) === k);
}

export function verifyStoredLogin(
  loginRaw: string,
  password: string
): { role: AccountRole; displayName: string; login: string } | null {
  const a = findStoredAccount(loginRaw);
  if (!a) return null;
  const pwd = password.trim();
  if (!pwd) return null;
  if (!bcrypt.compareSync(pwd, a.passwordHash)) return null;
  return { role: a.role, displayName: a.displayName, login: a.login.trim() };
}

export function hasPlatformAdmin(): boolean {
  return readAccounts().some((a) => a.role === "platform_admin");
}

export function toPublicAccount(a: StoredAccount): StoredAccountPublic {
  return {
    id: a.id,
    login: a.login,
    role: a.role,
    displayName: a.displayName,
    orgLabel: a.orgLabel,
    managedByLogin: a.managedByLogin,
    royaltySharePercent: a.royaltySharePercent,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function listPublicAccounts(): StoredAccountPublic[] {
  return readAccounts().map(toPublicAccount);
}

export function createStoredAccount(input: {
  login: string;
  password: string;
  role: AccountRole;
  displayName: string;
  orgLabel?: string;
  royaltySharePercent?: number;
}): { ok: true } | { ok: false; error: string } {
  const login = input.login.trim();
  if (!normalizeLoginKey(login)) return { ok: false, error: "Thiếu tên đăng nhập." };
  if (findStoredAccount(login)) return { ok: false, error: "Tài khoản đã tồn tại." };
  const pwd = input.password.trim();
  if (pwd.length < 8) return { ok: false, error: "Mật khẩu tối thiểu 8 ký tự." };
  if (input.role === "platform_admin") {
    return { ok: false, error: "Không thể tự đăng ký quản trị nền tảng qua form công khai." };
  }
  const all = readAccounts();
  const now = new Date().toISOString();
  const row: StoredAccount = {
    id: randomUUID(),
    login,
    passwordHash: bcrypt.hashSync(pwd, 10),
    role: input.role,
    displayName: input.displayName.trim() || login,
    orgLabel: input.orgLabel?.trim() || undefined,
    royaltySharePercent:
      input.royaltySharePercent != null && Number.isFinite(input.royaltySharePercent)
        ? Math.min(100, Math.max(0, input.royaltySharePercent))
        : undefined,
    createdAt: now,
    updatedAt: now,
  };
  all.push(row);
  writeAccounts(all);
  return { ok: true };
}

export function createFirstPlatformAdmin(input: {
  login: string;
  password: string;
  displayName: string;
}): { ok: true } | { ok: false; error: string } {
  if (hasPlatformAdmin()) return { ok: false, error: "Đã có quản trị nền tảng trong hệ thống." };
  const login = input.login.trim();
  if (!normalizeLoginKey(login)) return { ok: false, error: "Thiếu tên đăng nhập." };
  if (findStoredAccount(login)) return { ok: false, error: "Tài khoản đã tồn tại." };
  const pwd = input.password.trim();
  if (pwd.length < 10) return { ok: false, error: "Mật khẩu quản trị tối thiểu 10 ký tự." };
  const all = readAccounts();
  const now = new Date().toISOString();
  const row: StoredAccount = {
    id: randomUUID(),
    login,
    passwordHash: bcrypt.hashSync(pwd, 10),
    role: "platform_admin",
    displayName: input.displayName.trim() || login,
    createdAt: now,
    updatedAt: now,
  };
  all.push(row);
  writeAccounts(all);
  return { ok: true };
}

export function upsertStoredAccountAdmin(input: {
  login: string;
  password?: string;
  displayName: string;
  role: AccountRole;
  orgLabel?: string;
  royaltySharePercent?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const login = input.login.trim();
  if (!normalizeLoginKey(login)) return { ok: false, error: "Thiếu tên đăng nhập." };
  const all = readAccounts();
  const i = all.findIndex((a) => normalizeLoginKey(a.login) === normalizeLoginKey(login));
  const now = new Date().toISOString();

  if (i < 0) {
    const pwd = input.password?.trim() ?? "";
    if (pwd.length < 8) return { ok: false, error: "Tài khoản mới cần mật khẩu tối thiểu 8 ký tự." };
    const row: StoredAccount = {
      id: randomUUID(),
      login,
      passwordHash: bcrypt.hashSync(pwd, 10),
      role: input.role,
      displayName: input.displayName.trim() || login,
      orgLabel: input.orgLabel?.trim() || undefined,
      royaltySharePercent:
        input.royaltySharePercent != null && Number.isFinite(input.royaltySharePercent)
          ? Math.min(100, Math.max(0, input.royaltySharePercent))
          : undefined,
      createdAt: now,
      updatedAt: now,
    };
    all.push(row);
    writeAccounts(all);
    return { ok: true };
  }

  const cur = all[i]!;
  const pwd = input.password?.trim();
  let passwordHash = cur.passwordHash;
  if (pwd && pwd.length >= 8) passwordHash = bcrypt.hashSync(pwd, 10);
  else if (pwd && pwd.length > 0 && pwd.length < 8) {
    return { ok: false, error: "Mật khẩu mới tối thiểu 8 ký tự (hoặc để trống để giữ mật khẩu cũ)." };
  }

  all[i] = {
    ...cur,
    displayName: input.displayName.trim() || login,
    role: input.role,
    orgLabel: input.orgLabel?.trim() || undefined,
    royaltySharePercent:
      input.royaltySharePercent === null || input.royaltySharePercent === undefined
        ? undefined
        : Math.min(100, Math.max(0, Number(input.royaltySharePercent))),
    passwordHash,
    updatedAt: now,
  };
  writeAccounts(all);
  return { ok: true };
}

export function deleteStoredAccount(loginRaw: string): { ok: true } | { ok: false; error: string } {
  const k = normalizeLoginKey(loginRaw);
  const all = readAccounts();
  const next = all.filter((a) => normalizeLoginKey(a.login) !== k);
  if (next.length === all.length) return { ok: false, error: "Không tìm thấy tài khoản." };
  const removed = all.find((a) => normalizeLoginKey(a.login) === k)!;
  const admins = next.filter((a) => a.role === "platform_admin");
  if (removed.role === "platform_admin" && admins.length === 0) {
    return { ok: false, error: "Không thể xóa quản trị nền tảng cuối cùng." };
  }
  writeAccounts(next);
  return { ok: true };
}

function findLabelAdmin(loginRaw: string): StoredAccount | undefined {
  const a = findStoredAccount(loginRaw);
  if (!a || a.role !== "customer_admin") return undefined;
  return a;
}

export function listLabelArtistAccounts(labelLoginRaw: string): StoredAccountPublic[] {
  const labelKey = normalizeLoginKey(labelLoginRaw);
  return readAccounts()
    .filter(
      (a) =>
        a.role === "artist" &&
        a.managedByLogin != null &&
        normalizeLoginKey(a.managedByLogin) === labelKey
    )
    .map(toPublicAccount);
}

export function upsertLabelArtistAccount(
  labelLoginRaw: string,
  input: {
    login: string;
    password?: string;
    displayName: string;
    royaltySharePercent?: number | null;
  }
): { ok: true } | { ok: false; error: string } {
  const label = findLabelAdmin(labelLoginRaw);
  if (!label) return { ok: false, error: "Cần phiên admin nhãn (label)." };

  const login = input.login.trim();
  if (!normalizeLoginKey(login)) return { ok: false, error: "Thiếu tên đăng nhập." };

  const all = readAccounts();
  const i = all.findIndex((a) => normalizeLoginKey(a.login) === normalizeLoginKey(login));
  const now = new Date().toISOString();
  const labelOrg = label.orgLabel?.trim() || undefined;

  if (i < 0) {
    if (findStoredAccount(login)) return { ok: false, error: "Tài khoản đã tồn tại." };
    const pwd = input.password?.trim() ?? "";
    if (pwd.length < 8) return { ok: false, error: "Tài khoản mới cần mật khẩu tối thiểu 8 ký tự." };
    const row: StoredAccount = {
      id: randomUUID(),
      login,
      passwordHash: bcrypt.hashSync(pwd, 10),
      role: "artist",
      displayName: input.displayName.trim() || login,
      orgLabel: labelOrg,
      managedByLogin: label.login.trim(),
      royaltySharePercent:
        input.royaltySharePercent != null && Number.isFinite(input.royaltySharePercent)
          ? Math.min(100, Math.max(0, input.royaltySharePercent))
          : undefined,
      createdAt: now,
      updatedAt: now,
    };
    all.push(row);
    writeAccounts(all);
    return { ok: true };
  }

  const cur = all[i]!;
  if (cur.role !== "artist") {
    return { ok: false, error: "Chỉ có thể quản lý tài khoản nghệ sĩ do nhãn tạo." };
  }
  if (!cur.managedByLogin || normalizeLoginKey(cur.managedByLogin) !== normalizeLoginKey(label.login)) {
    return { ok: false, error: "Tài khoản này không thuộc nhãn của bạn." };
  }

  const pwd = input.password?.trim();
  let passwordHash = cur.passwordHash;
  if (pwd && pwd.length >= 8) passwordHash = bcrypt.hashSync(pwd, 10);
  else if (pwd && pwd.length > 0 && pwd.length < 8) {
    return { ok: false, error: "Mật khẩu mới tối thiểu 8 ký tự (hoặc để trống để giữ mật khẩu cũ)." };
  }

  all[i] = {
    ...cur,
    displayName: input.displayName.trim() || login,
    orgLabel: labelOrg ?? cur.orgLabel,
    royaltySharePercent:
      input.royaltySharePercent === null || input.royaltySharePercent === undefined
        ? undefined
        : Math.min(100, Math.max(0, Number(input.royaltySharePercent))),
    passwordHash,
    updatedAt: now,
  };
  writeAccounts(all);
  return { ok: true };
}

export function deleteLabelArtistAccount(
  labelLoginRaw: string,
  targetLoginRaw: string
): { ok: true } | { ok: false; error: string } {
  const label = findLabelAdmin(labelLoginRaw);
  if (!label) return { ok: false, error: "Cần phiên admin nhãn (label)." };

  const k = normalizeLoginKey(targetLoginRaw);
  const all = readAccounts();
  const target = all.find((a) => normalizeLoginKey(a.login) === k);
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản." };
  if (target.role !== "artist") {
    return { ok: false, error: "Chỉ có thể xóa tài khoản nghệ sĩ." };
  }
  if (!target.managedByLogin || normalizeLoginKey(target.managedByLogin) !== normalizeLoginKey(label.login)) {
    return { ok: false, error: "Tài khoản này không thuộc nhãn của bạn." };
  }

  const next = all.filter((a) => normalizeLoginKey(a.login) !== k);
  writeAccounts(next);
  return { ok: true };
}
