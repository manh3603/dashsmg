"use client";

import Link from "next/link";
import { Music, Zap, DollarSign, ShieldCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 text-white">
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Music className="h-8 w-8 text-fuchsia-400" />
            <span className="text-lg">SMG Distribution</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-lg px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white">
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 font-medium text-white hover:from-violet-400 hover:to-fuchsia-400"
            >
              Đăng ký
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="mb-4 inline-block rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-1 text-sm text-violet-200">
            Phân phối nhạc toàn cầu · Content ID
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Đưa âm nhạc của bạn lên mọi nền tảng — nhanh, minh bạch, đáng tin cậy
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-400">
            Nền tảng phát hành dành cho nghệ sĩ độc lập và nhãn đĩa: giao diện nhẹ, quy trình rõ ràng, hỗ trợ bảo vệ bản quyền và báo cáo thu nhập chi tiết.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-semibold text-white hover:from-violet-400 hover:to-fuchsia-400"
            >
              Bắt đầu miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border border-white/20 px-6 py-3 font-medium text-white hover:bg-white/5"
            >
              Đã có tài khoản
            </Link>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold md:text-3xl">Thế mạnh</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-400">
              Tối ưu cho công việc hàng ngày của creator và label
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <Zap className="mb-4 h-10 w-10 text-amber-400" />
                <h3 className="text-lg font-semibold">Trình duyệt tốc độ</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Bảng điều khiển nhẹ, tải nhanh, bảng dữ liệu hỗ trợ tìm kiếm và sắp xếp tức thì cho kho nhạc lớn.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <DollarSign className="mb-4 h-10 w-10 text-emerald-400" />
                <h3 className="text-lg font-semibold">Giá thành minh bạch</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Theo dõi doanh thu ước tính, báo cáo hàng tháng và rút tiền với lịch sử giao dịch rõ ràng.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <ShieldCheck className="mb-4 h-10 w-10 text-violet-300" />
                <h3 className="text-lg font-semibold">Hỗ trợ Content ID</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Quy trình và tài liệu hướng dẫn bảo vệ tác phẩm trên các nền tảng UGC và cửa hàng nhạc.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} SMG Distribution · Phát hành nhạc số
        </footer>
      </main>
    </div>
  );
}
