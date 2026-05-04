/**
 * Chạy backend (tsx watch) + Next dev — gọi trực tiếp `node` + CLI (ổn định trên Windows, tránh npm spawn lồng).
 * Thứ tự: kill cổng 3001 → backend → chờ /health → Next.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";

const isWin = process.platform === "win32";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const backendRoot = path.join(root, "backend");

const BACKEND_WAIT_MS = Math.min(
  Math.max(Number(process.env.DEV_BACKEND_WAIT_MS ?? 120000) || 120000, 5000),
  300000
);

function spawnNpx(args) {
  return spawn("npx", args, {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env },
  });
}

await new Promise((resolve) => {
  const k = spawnNpx(["--yes", "kill-port", "3001"]);
  k.on("close", () => resolve());
});

const tsxCli = path.join(backendRoot, "node_modules", "tsx", "dist", "cli.mjs");
const backend = spawn(process.execPath, [tsxCli, "watch", "src/index.ts"], {
  cwd: backendRoot,
  stdio: "inherit",
  env: { ...process.env },
});

backend.on("error", (err) => {
  console.error("[dev-all] Không khởi động được backend (tsx):", err.message);
  process.exit(1);
});

const healthUrl = "http://127.0.0.1:3001/health";
const deadline = Date.now() + BACKEND_WAIT_MS;
let backendReady = false;
while (Date.now() < deadline) {
  try {
    const res = await fetch(healthUrl);
    if (res.ok) {
      backendReady = true;
      break;
    }
  } catch {
    /* chưa listen */
  }
  await new Promise((r) => setTimeout(r, 400));
}
if (!backendReady) {
  console.error(`[dev-all] Hết thời gian chờ backend (${healthUrl}). Tăng DEV_BACKEND_WAIT_MS nếu máy chậm.`);
  try {
    backend.kill(isWin ? undefined : "SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(1);
}

const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
console.log("[dev-all] Backend sẵn sàng — khởi động Next.js…\n");

const frontend = spawn(process.execPath, [nextCli, "dev", "--hostname", "0.0.0.0"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});

frontend.on("error", (err) => {
  console.error("[dev-all] Không khởi động được Next.js:", err.message);
  try {
    backend.kill(isWin ? undefined : "SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(1);
});

let shuttingDown = false;
function killAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    backend.kill(isWin ? undefined : "SIGTERM");
  } catch {
    /* ignore */
  }
  try {
    frontend.kill(isWin ? undefined : "SIGTERM");
  } catch {
    /* ignore */
  }
}

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  killAll();
  process.exit(0);
});

const race = await Promise.race([
  once(backend, "exit").then(([code]) => ({ who: "backend", code: code ?? 0 })),
  once(frontend, "exit").then(([code]) => ({ who: "next", code: code ?? 0 })),
]);

killAll();
if (race.who === "backend") {
  console.error(`[dev-all] Backend thoát (mã ${race.code}).`);
}
process.exit(race.code === 0 ? 0 : race.code ?? 1);
