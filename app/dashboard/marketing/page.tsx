"use client";

import { Link2, LifeBuoy } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Công cụ bổ sung</h1>
        <p className="mt-1 text-slate-600">SmartLink cho fan và kênh hỗ trợ kỹ thuật / bản quyền</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600">
            <Link2 className="h-6 w-6" />
            <h2 className="text-lg font-semibold text-slate-900">SmartLink</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Tạo một trang landing gom link Spotify, Apple Music, YouTube, TikTok… để chia sẻ với người hâm mộ.
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-700"
            onClick={() => alert("Trình tạo SmartLink (demo)")}
          >
            Tạo SmartLink mới
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600">
            <LifeBuoy className="h-6 w-6" />
            <h2 className="text-lg font-semibold text-slate-900">Hỗ trợ</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Gửi vé hỗ trợ kỹ thuật (upload, metadata) hoặc bản quyền (Content ID, vi phạm).
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={() => alert("Mở form vé kỹ thuật (demo)")}
            >
              Vé kỹ thuật
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={() => alert("Mở form vé bản quyền (demo)")}
            >
              Vé bản quyền
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
