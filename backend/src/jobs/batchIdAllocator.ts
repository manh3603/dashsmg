import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ddex-batch-seq.json");

const START = 100_000;

type State = { next: number };

function readState(): State {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    const initial: State = { next: START };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const p = JSON.parse(raw) as State;
    if (typeof p.next !== "number" || !Number.isInteger(p.next)) {
      return { next: START };
    }
    return { next: Math.max(START, p.next) };
  } catch {
    return { next: START };
  }
}

function writeState(s: State) {
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8");
}

/** Batch id dạng batch_100000, batch_100001, … — bắt đầu từ 100000. */
export function allocateNextBatchId(): string {
  const s = readState();
  const id = s.next;
  writeState({ next: id + 1 });
  return `batch_${id}`;
}
