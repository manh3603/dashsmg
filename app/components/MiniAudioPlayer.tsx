"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

export default function MiniAudioPlayer() {
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
    <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
          <Music className="h-4 w-4 shrink-0 text-cyan-600" />
          <span>{fileName ? "Đổi file" : "Thử nghe file tải lên"}</span>
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
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
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
                className="rounded-full bg-cyan-600 p-2 text-white hover:bg-cyan-700"
                onClick={toggle}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
              </button>
              <button
                type="button"
                aria-label="Tua tới 5s"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  const el = audioRef.current;
                  if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
                }}
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <span className="text-xs tabular-nums text-slate-500">
                {fmt(current)} / {fmt(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Volume2 className="h-4 w-4" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-24 accent-cyan-600"
              />
            </div>
            <p className="max-w-[200px] truncate text-xs text-slate-500" title={fileName ?? ""}>
              {fileName}
            </p>
          </>
        )}
        {!url && (
          <p className="text-xs text-slate-400">Chọn file WAV/FLAC/MP3 để nghe thử trước khi gửi duyệt.</p>
        )}
      </div>
    </div>
  );
}
