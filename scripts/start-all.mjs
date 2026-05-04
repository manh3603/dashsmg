import { spawn } from "node:child_process";

/**
 * Render chỉ public 1 cổng (PORT). Ta chạy:
 * - Backend Express nội bộ ở 127.0.0.1:3001
 * - Next.js lắng nghe PORT (public)
 *
 * Next route handler `/smg-api/...` sẽ proxy sang backend nội bộ qua BACKEND_PROXY_TARGET
 * (mặc định đã là http://127.0.0.1:3001).
 */

const BACKEND_PORT = 3001;
const FRONTEND_PORT = Number(process.env.PORT || 3000);

function run(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    // Windows: cần shell để chạy .cmd ổn định (tránh spawn EINVAL).
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });

  child.on("exit", (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${name}] exited (${why})`);
    // Nếu 1 tiến trình chết thì tắt cả service để Render restart.
    process.exit(typeof code === "number" ? code : 1);
  });

  return child;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBackendReady(origin, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  const url = `${origin.replace(/\/$/, "")}/health`;
  process.stdout.write(`[start] waiting for backend ${url}\n`);
  // Poll nhanh để tránh race (Next nhận request trước khi backend listen).
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        process.stdout.write("[start] backend ready\n");
        return;
      }
    } catch {
      // ignore
    }
    await sleep(400);
  }
  throw new Error(`Backend not ready after ${timeoutMs}ms: ${url}`);
}

const renderPublic =
  process.env.PUBLIC_BACKEND_URL?.trim() ||
  (process.env.RENDER_EXTERNAL_URL
    ? `${String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, "")}/smg-api`
    : "");

const backend = run(
  "backend",
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "start", "--prefix", "backend"],
  {
    NODE_ENV: process.env.NODE_ENV || "production",
    PORT: String(BACKEND_PORT),
    BIND_HOST: "127.0.0.1",
    /** Link upload công khai: Render dùng cùng host + /smg-api proxy tới backend. */
    PUBLIC_BACKEND_URL: renderPublic || `http://127.0.0.1:${BACKEND_PORT}`,
    /** CORS khi NODE_ENV=production: cho phép origin trang (Render tự có RENDER_EXTERNAL_URL). */
    CORS_ORIGIN:
      process.env.CORS_ORIGIN?.trim() ||
      (process.env.RENDER_EXTERNAL_URL ? String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, "") : "") ||
      `http://127.0.0.1:${FRONTEND_PORT}`,
  }
);

// Ensure Next proxies to local backend by default.
const proxyTarget = (process.env.BACKEND_PROXY_TARGET || "").trim();
const frontendEnv =
  proxyTarget.length > 0
    ? {}
    : { BACKEND_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}` };

const effectiveBackendOrigin =
  proxyTarget.length > 0 ? proxyTarget : `http://127.0.0.1:${BACKEND_PORT}`;

let frontend = null;

// Start frontend only after backend is reachable to avoid 502/fetch failed.
waitForBackendReady(effectiveBackendOrigin)
  .then(() => {
    frontend = run(
      "frontend",
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "start"],
      {
        ...frontendEnv,
        PORT: String(FRONTEND_PORT),
      }
    );
  })
  .catch((e) => {
    console.error(`[start] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });

function shutdown() {
  try {
    backend.kill("SIGTERM");
  } catch {}
  try {
    frontend?.kill?.("SIGTERM");
  } catch {}
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

