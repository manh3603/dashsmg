"use client";

import Link from "next/link";
import { Link2, LifeBuoy } from "lucide-react";
import { mailtoSupport } from "@/lib/support-contact";

export default function MarketingPage() {
  const techMail = mailtoSupport("[SMG] Vé hỗ trợ kỹ thuật", "Xin chào Soul Music,\n\nTài khoản / email đăng nhập:\n\nMô tả sự cố (upload, metadata, cửa hàng):\n\n");
  const rightsMail = mailtoSupport("[SMG] Vé bản quyền / Content ID", "Xin chào Soul Music,\n\nTài khoản / email đăng nhập:\n\nMô tả (Content ID, vi phạm, gỡ nội dung):\n\n");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Công cụ bổ sung</h1>
        <p className="mt-1 text-slate-600">SmartLink cho fan và kênh hỗ trợ qua email Soul Music Asia</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <Link2 className="h-6 w-6" />
            <h2 className="text-lg font-semibold text-slate-900">Smart Link</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Trang landing công khai mở tìm kiếm Spotify, Apple Music, YouTube Music — chọn bản trong kho và sao chép liên kết.
          </p>
          <Link
            href="/dashboard/marketing/smartlink"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-fuchsia-700"
          >
            Tạo Smart Link
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <LifeBuoy className="h-6 w-6" />
            <h2 className="text-lg font-semibold text-slate-900">Hỗ trợ</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Gửi vé qua email <strong className="font-medium text-slate-800">Info@soulmusic.asia</strong> — kỹ thuật (upload, metadata) hoặc bản quyền (Content ID,
            vi phạm).
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <a
              href={techMail}
              className="flex-1 rounded-lg border border-violet-200 bg-violet-50 py-2.5 text-center text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              Vé kỹ thuật
            </a>
            <a
              href={rightsMail}
              className="flex-1 rounded-lg border border-violet-200 bg-violet-50 py-2.5 text-center text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              Vé bản quyền
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
