"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Music } from "lucide-react";

function SpotifySearchUrl(q: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}
function AppleMusicSearchUrl(q: string) {
  return `https://music.apple.com/search?term=${encodeURIComponent(q)}`;
}
function YoutubeSearchUrl(q: string) {
  return `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;
}

function SmartLinkInner() {
  const sp = useSearchParams();
  const title = sp.get("title")?.trim() ?? "";
  const artist = sp.get("artist")?.trim() ?? "";
  const isrc = sp.get("isrc")?.trim() ?? "";

  const query = useMemo(() => {
    if (title && artist) return `${title} ${artist}`;
    if (title) return title;
    if (artist) return artist;
    return "";
  }, [title, artist]);

  const links =
    query.length > 0
      ? [
          { name: "Spotify", href: SpotifySearchUrl(query), color: "from-green-600 to-emerald-600" },
          { name: "Apple Music", href: AppleMusicSearchUrl(query), color: "from-pink-600 to-rose-600" },
          { name: "YouTube Music", href: YoutubeSearchUrl(query), color: "from-red-600 to-orange-600" },
        ]
      : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-violet-950 to-zinc-950 text-white">
      <header className="border-b border-white/10 px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Music className="h-10 w-10 text-fuchsia-400" />
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-300/80">Soul Music Asia · Smart Link</p>
            <h1 className="text-2xl font-bold">
              {title || artist ? [title, artist].filter(Boolean).join(" — ") : "Smart Link"}
            </h1>
            {isrc ? <p className="mt-1 font-mono text-sm text-slate-400">ISRC {isrc}</p> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {!query ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Thiếu tham số. Liên kết đầy đủ có dạng{" "}
            <code className="rounded bg-black/40 px-1 text-xs text-fuchsia-200">
              /smartlink?title=...&amp;artist=...
            </code>
          </p>
        ) : (
          <>
            <p className="mb-8 text-sm text-slate-400">
              Chọn nền tảng để mở tìm kiếm (liên kết tìm kiếm công khai — ID album/track phụ thuộc cửa hàng sau khi phát hành).
            </p>
            <ul className="flex flex-col gap-4">
              {links.map((l) => (
                <li key={l.name}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-xl bg-gradient-to-r px-5 py-4 font-semibold text-white shadow-lg transition hover:opacity-95 ${l.color}`}
                  >
                    <span>{l.name}</span>
                    <ExternalLink className="h-5 w-5 opacity-90" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-12 text-center text-xs text-slate-500">
          <Link href="/" className="text-violet-300 hover:underline">
            SMG Distribution
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function SmartLinkPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-slate-400">Đang tải…</div>
      }
    >
      <SmartLinkInner />
    </Suspense>
  );
}
