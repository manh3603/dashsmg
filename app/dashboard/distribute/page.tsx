import { Suspense } from "react";
import CreateReleaseFlow from "@/components/CreateReleaseFlow";
import BackendBulkPanel from "@/components/BackendBulkPanel";

export default function DistributePage() {
  return (
    <div className="space-y-8">
      <Suspense
        fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Đang tải…</div>}
      >
        <CreateReleaseFlow />
      </Suspense>
      <details className="rounded-xl border border-slate-200 bg-slate-50/80 open:bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
          <span className="border-b border-dotted border-slate-400 hover:text-slate-900">
            Công cụ nâng cao — bulk JSON, xuất ZIP, batch thủ công
          </span>
        </summary>
        <div className="border-t border-slate-200 px-2 pb-4 pt-2 sm:px-4">
          <BackendBulkPanel />
        </div>
      </details>
    </div>
  );
}
