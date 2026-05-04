"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Link2, Check } from "lucide-react";
import type { CatalogItem } from "@/lib/smg-storage";
import { getCatalog } from "@/lib/smg-storage";

function buildSmartLink(origin: string, item: Pick<CatalogItem, "title" | "artist" | "isrc">): string {
  const q = new URLSearchParams();
  q.set("title", item.title);
  if (item.artist?.trim()) q.set("artist", item.artist.trim());
  if (item.isrc?.trim()) q.set("isrc", item.isrc.trim());
  return `${origin}/smartlink?${q.toString()}`;
}

export default function MarketingSmartLinkPage() {
  const [list, setList] = useState<CatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => setList(getCatalog()), []);

  useEffect(() => {
    queueMicrotask(() => reload());
    const on = () => queueMicrotask(() => reload());
    window.addEventListener("smg-storage", on);
    return () => window.removeEventListener("smg-storage", on);
  }, [reload]);

  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  const selected = list.find((x) => x.id === selectedId);
  const url = selected && origin ? buildSmartLink(origin, selected) : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/marketing" className="text-sm text-violet-600 hover:underline">
          ← Công cụ Marketing
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Smart Link</h1>
        <p className="mt-1 text-slate-600">
          Chọn bản phát hành trong kho để tạo liên kết chia sẻ — trang công khai mở tìm kiếm Spotify, Apple Music, YouTube Music.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-violet-600">
          <Link2 className="h-6 w-6" />
          <h2 className="text-lg font-semibold text-slate-900">Tạo liên kết</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Bản phát hành trong kho</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setCopied(false);
              }}
            >
              <option value="">— Chọn —</option>
              {list.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.artist ? ` — ${r.artist}` : ""} ({r.status})
                </option>
              ))}
            </select>
            <button type="button" className="mt-2 text-sm text-violet-600 hover:underline" onClick={reload}>
              Tải lại kho
            </button>
          </div>

          {url && (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Liên kết của bạn</p>
              <p className="mt-2 break-all font-mono text-sm text-slate-800">{url}</p>
              <button
                type="button"
                onClick={() => void copy()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-violet-700 hover:to-fuchsia-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Đã sao chép" : "Sao chép"}
              </button>
              <p className="mt-3 text-xs text-slate-500">
                Xem trước:{" "}
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-700 hover:underline">
                  Mở Smart Link
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
