import fs from "node:fs";
import path from "node:path";
import { buildSoulUpcFromItemRef } from "./ean13.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "upc-sequence.json");

type State = { next: number };

function ensure(): State {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    const initial: State = { next: 1 };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const p = JSON.parse(raw) as State;
    if (typeof p.next !== "number" || !Number.isInteger(p.next)) {
      return { next: 1 };
    }
    /** Chuẩn mới: Item Reference bắt đầu 000001; file cũ next=0 → 1. */
    const next = p.next < 1 ? 1 : p.next;
    return { next };
  } catch {
    return { next: 1 };
  }
}

function writeState(s: State) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8");
}

export type AllocateUpcResult = { ok: true; upc: string; sequence: number } | { ok: false; error: string };

/** Cấp UPC 893274 + 6 số + check digit; sequence tăng trong data/upc-sequence.json. */
export function allocateNextSoulUpc(): AllocateUpcResult {
  const state = ensure();
  if (state.next > 999_999) {
    return { ok: false, error: "Đã hết dải Item Reference UPC Soul (000001–999999)." };
  }
  const itemRef = state.next;
  const upc = buildSoulUpcFromItemRef(itemRef);
  writeState({ next: itemRef + 1 });
  return { ok: true, upc, sequence: itemRef };
}
