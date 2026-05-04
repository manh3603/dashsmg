import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { AccountRole } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

export type SessionRecord = {
  token: string;
  login: string;
  role: AccountRole;
  displayName: string;
  exp: number;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSessions(): SessionRecord[] {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(items: SessionRecord[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(items, null, 2), "utf8");
}

function prune(s: SessionRecord[]): SessionRecord[] {
  const now = Date.now();
  return s.filter((x) => x.exp > now);
}

export function issueSession(login: string, role: AccountRole, displayName: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const all = prune(readSessions());
  all.push({ token, login: login.trim(), role, displayName: displayName.trim(), exp });
  writeSessions(all);
  return token;
}

export function revokeSession(token: string | undefined | null): void {
  if (!token?.trim()) return;
  const t = token.trim();
  const all = prune(readSessions()).filter((x) => x.token !== t);
  writeSessions(all);
}

export function resolveSession(token: string | undefined | null): SessionRecord | null {
  if (!token?.trim()) return null;
  const t = token.trim();
  const row = prune(readSessions()).find((x) => x.token === t);
  if (!row || row.exp <= Date.now()) return null;
  return row;
}

export function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m ? m[1]!.trim() : null;
}
