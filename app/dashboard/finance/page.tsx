"use client";

import { useState } from "react";
import { Download, Wallet, History, Users, X } from "lucide-react";
import RequireFinancialAccess from "@/components/RequireFinancialAccess";
import { useLanguage } from "@/context/LanguageContext";

type ModalKey = "withdraw" | "report" | "splits" | null;

function FinancePageContent() {
  const { t } = useLanguage();
  const [method, setMethod] = useState<"bank" | "paypal" | "payoneer">("bank");
  const [modal, setModal] = useState<ModalKey>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("nav.finance")}</h1>
        <p className="mt-1 text-slate-600">{t("finance.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("finance.balance.label")}</p>
              <p className="text-3xl font-bold text-slate-400">—</p>
              <p className="mt-1 text-xs text-slate-500">
                Số dư thật sẽ hiển thị sau khi nối báo cáo thanh toán từ đối tác / cửa hàng.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700"
              onClick={() => setModal("withdraw")}
            >
              {t("finance.withdraw")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setModal("report")}
            >
              <Download className="h-4 w-4" />
              Báo cáo tháng (Excel)
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Chia sẻ doanh thu (Splits)</h2>
          <p className="mt-2 text-sm text-slate-600">Quản lý % giữa các nghệ sĩ trong cùng một track.</p>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => setModal("splits")}
          >
            <Users className="h-4 w-4" />
            Quản lý splits
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Phương thức thanh toán</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["bank", "Ngân hàng"],
              ["paypal", "PayPal"],
              ["payoneer", "Payoneer"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMethod(k)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                method === k ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {method === "bank" && "Khi bật module thanh toán: thêm STK, tên chủ tài khoản, chi nhánh — lưu qua API nội bộ."}
          {method === "paypal" && "Liên kết email PayPal nhận thanh toán (sau khi có OAuth / form lưu trữ)."}
          {method === "payoneer" && "Liên kết tài khoản Payoneer (sau khi có tích hợp)."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("finance.history.title")}</h2>
        </div>
        <p className="text-sm text-slate-500">
          Chưa có giao dịch hiển thị. Danh sách rút tiền và ghi có từ cửa hàng sẽ xuất hiện khi hệ thống đồng bộ báo cáo tài chính.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Ngày</th>
                <th className="py-2 pr-4 font-medium">Loại</th>
                <th className="py-2 pr-4 font-medium">Số tiền</th>
                <th className="py-2 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Không có dữ liệu mẫu
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Đóng" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {modal === "withdraw" && t("finance.withdraw")}
                {modal === "report" && "Báo cáo tháng (Excel)"}
                {modal === "splits" && "Quản lý splits"}
              </h3>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setModal(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {modal === "withdraw" &&
                "Luồng rút tiền (tạo lệnh, KYC, hạn mức) sẽ được bật khi backend thanh toán và quyền người dùng được cấu hình. Hiện chỉ là giao diện chuẩn bị."}
              {modal === "report" &&
                "Xuất Excel chi tiết theo tháng cần nối báo cáo từ cửa hàng hoặc kho số liệu nội bộ. Bạn có thể lưu khung cột (ISRC, platform, gross, fee…) trong sprint tích hợp tiếp theo."}
              {modal === "splits" &&
                "Trình chỉnh sửa % splits (theo track / release) sẽ mở form đầy đủ khi có model lưu trữ và đồng bộ ERN/CIS. Liên hệ admin để ưu tiên tính năng này nếu cần gấp."}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-200"
              onClick={() => setModal(null)}
            >
              {t("finance.modal.ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <RequireFinancialAccess>
      <FinancePageContent />
    </RequireFinancialAccess>
  );
}
