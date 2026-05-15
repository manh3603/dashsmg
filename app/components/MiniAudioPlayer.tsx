"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function MiniAudioPlayer() {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (url) URL.revokeObjectURL(url);
    const next = URL.createObjectURL(file);
    setUrl(next);
    setFileName(file.name);
    setPlaying(false);
    setCurrent(0);
  }, [url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !url) return;
    el.volume = volume;
  }, [url, volume]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-t border-violet-900/40 bg-gradient-to-r from-zinc-950 via-violet-950/90 to-zinc-950 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-700/50 bg-black/30 px-3 py-2 text-sm text-slate-300 hover:bg-violet-950/40">
          <Music className="h-4 w-4 shrink-0 text-fuchsia-400" />
          <span>{fileName ? t("player.changeFile") : t("player.pickFile")}</span>
          <input type="file" accept="audio/wav,audio/flac,audio/mpeg,audio/*" className="hidden" onChange={onPickFile} />
        </label>

        {url && (
          <>
            <audio
              ref={audioRef}
              src={url}
              onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
              onEnded={() => setPlaying(false)}
            />
            <div className="flex min-w-[200px] flex-1 items-center gap-2">
              <button
                type="button"
                aria-label="Tua lại 5s"
                className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                onClick={() => {
                  const el = audioRef.current;
                  if (el) el.currentTime = Math.max(0, el.currentTime - 5);
                }}
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={playing ? "Tạm dừng" : "Phát"}
                className="rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 text-white hover:from-violet-500 hover:to-fuchsia-500"
                onClick={toggle}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
              </button>
              <button
                type="button"
                aria-label="Tua tới 5s"
                className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                onClick={() => {
                  const el = audioRef.current;
                  if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
                }}
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <span className="text-xs tabular-nums text-slate-400">
                {fmt(current)} / {fmt(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Volume2 className="h-4 w-4" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-24 accent-violet-500"
              />
            </div>
            <p className="max-w-[200px] truncate text-xs text-slate-400" title={fileName ?? ""}>
              {fileName}
            </p>
          </>
        )}
        {!url && (
          <p className="text-xs text-slate-500">{t("player.hint")}</p>
        )}
      </div>
    </div>
  );
}
