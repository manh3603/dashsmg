"use client";

import { Suspense } from "react";
import CreateReleaseFlow from "@/components/CreateReleaseFlow";
import BackendBulkPanel from "@/components/BackendBulkPanel";
import { useLanguage } from "@/context/LanguageContext";

function DistributePageContent() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">{t("common.loading")}</div>
        }
      >
        <CreateReleaseFlow />
      </Suspense>
      <details className="rounded-xl border border-slate-200 bg-slate-50/80 open:bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
          <span className="border-b border-dotted border-slate-400 hover:text-slate-900">{t("distribute.advancedTools")}</span>
        </summary>
        <div className="border-t border-slate-200 px-2 pb-4 pt-2 sm:px-4">
          <BackendBulkPanel />
        </div>
      </details>
    </div>
  );
}

export default function DistributePage() {
  return <DistributePageContent />;
}
