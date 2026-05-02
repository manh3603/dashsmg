import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function backendOrigin(): string {
  return (process.env.BACKEND_PROXY_TARGET || "http://127.0.0.1:3001").replace(/\/$/, "");
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function proxyToBackend(req: NextRequest, pathSegments: string[] | undefined) {
  const url = new URL(req.url);
  const pathStr = pathSegments?.length ? pathSegments.join("/") : "";
  const target = `${backendOrigin()}/${pathStr}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body) {
      init.body = req.body;
      init.duplex = "half";
    }
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: `Không kết nối được backend tại ${backendOrigin()}. Đã chạy «npm run dev --prefix backend» hoặc «npm run dev:all» chưa? (${msg})`,
      },
      { status: 502 }
    );
  }

  const out = new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
  });

  res.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "transfer-encoding" || k === "connection") return;
    out.headers.set(key, value);
  });

  return out;
}

async function handle(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyToBackend(req, path);
}

export function GET(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function HEAD(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function POST(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function PUT(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function PATCH(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function DELETE(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
