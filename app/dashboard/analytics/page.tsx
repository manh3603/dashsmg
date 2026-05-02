"use client";

import Link from "next/link";
import RequireFinancialAccess from "@/components/RequireFinancialAccess";

function AnalyticsPageContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Phân tích số liệu</h1>
        <p className="mt-1 text-slate-600">
          Stream, download, doanh thu theo nền tảng và phân khúc người nghe sẽ hiển thị khi có dữ liệu từ cửa hàng / đối tác.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: "Stream & download theo thời gian",
            body: "Biểu đồ cột / đường sẽ nối API báo cáo (DSP, aggregator) khi bạn bật tích hợp.",
          },
          {
            title: "Doanh thu theo nền tảng",
            body: "Phân bổ doanh thu (Spotify, Apple Music, v.v.) cần file báo cáo hoặc webhook từ đối tác.",
          },
          {
            title: "Top tracks & địa lý",
            body: "Bảng xếp hạng và top thành phố sẽ điền từ số liệu thật, không dùng dữ liệu minh họa.",
          },
          {
            title: "Nhân khẩu người nghe",
            body: "Độ tuổi và phân khúc chỉ hiển thị khi DSP cung cấp (nếu có trong hợp đồng).",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.body}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Chưa có dữ liệu</p>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-slate-500">
        Xem tổng quan trạng thái phát hành tại{" "}
        <Link href="/dashboard" className="font-medium text-cyan-600 hover:underline">
          Trang chủ
        </Link>{" "}
        và{" "}
        <Link href="/dashboard/catalog" className="font-medium text-cyan-600 hover:underline">
          Kho nhạc
        </Link>
        .
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireFinancialAccess>
      <AnalyticsPageContent />
    </RequireFinancialAccess>
  );
}
