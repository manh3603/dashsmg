import fs from "node:fs";
import path from "node:path";

const PREFIX = "VNE0M";
const FIRST_NUM = 2_603_000;
const LAST_NUM = 2_699_999;
const FILE = path.join(process.cwd(), "data", "isrc-state.json");

type State = { lastAllocated: number };

function ensureDataDir() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readState(): State {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return { lastAllocated: FIRST_NUM - 1 };
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf8")) as { lastAllocated?: number };
    const n = typeof j.lastAllocated === "number" ? j.lastAllocated : FIRST_NUM - 1;
    return { lastAllocated: Math.min(Math.max(n, FIRST_NUM - 1), LAST_NUM) };
  } catch {
    return { lastAllocated: FIRST_NUM - 1 };
  }
}

function writeState(s: State) {
  ensureDataDir();
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8");
}

/** VNE0M + 7 chữ số (tổng 12 ký tự ISRC). */
function formatIsrc(num: number): string {
  return `${PREFIX}${String(num).padStart(7, "0")}`;
}

/**
 * Cấp ISRC kế tiếp trong dải VNE0M2603000 … VNE0M2699999 (một tiến trình — triển khai cluster cần khóa phân tán).
 */
export function allocateNextIsrc(): { ok: true; isrc: string } | { ok: false; error: string } {
  const state = readState();
  const next = state.lastAllocated + 1;
  if (next > LAST_NUM) {
    return {
      ok: false,
      error: `Đã hết dải ISRC (${formatIsrc(FIRST_NUM)} … ${formatIsrc(LAST_NUM)}).`,
    };
  }
  const num = Math.max(next, FIRST_NUM);
  writeState({ lastAllocated: num });
  return { ok: true, isrc: formatIsrc(num) };
}
