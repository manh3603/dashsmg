"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Plug } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import type { CmsStore } from "@/lib/smg-storage";
import { addCmsStore, getCmsStores, saveCmsStores } from "@/lib/smg-storage";

/** Khớp backend — PADPIDA / URL gửi ERN theo từng cửa hàng CIS (cấu hình trong backend/.env). */
const PRESETS: { id: string; name: string; hint: string }[] = [
  {
    id: "zing_mp3",
    name: "Zing MP3",
    hint: "HTTP POST ERN: CIS_DELIVERY_ZING_MP3_URL. Party: DDEX_PARTY_ZING_ID / DDEX_PARTY_ZING_NAME.",
  },
  {
    id: "vk_music",
    name: "VK Music",
    hint: "CIS_DELIVERY_VK_MUSIC_URL. Party: DDEX_PARTY_VK_ID / DDEX_PARTY_VK_NAME.",
  },
  {
    id: "yandex_music",
    name: "Yandex Music",
    hint: "CIS_DELIVERY_YANDEX_MUSIC_URL. Party: DDEX_PARTY_YANDEX_ID / DDEX_PARTY_YANDEX_NAME.",
  },
  {
    id: "zvuk",
    name: "ZVUK",
    hint: "CIS_DELIVERY_ZVUK_URL. Party: DDEX_PARTY_ZVUK_ID / DDEX_PARTY_ZVUK_NAME.",
  },
  {
    id: "kion_music",
    name: "Kion Music",
    hint: "CIS_DELIVERY_KION_MUSIC_URL. Party: DDEX_PARTY_KION_ID / DDEX_PARTY_KION_NAME.",
  },
];

export default function AdminStoresPage() {
  const [stores, setStores] = useState<CmsStore[]>([]);
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [customName, setCustomName] = useState("");
  const [customId, setCustomId] = useState("");

  const reload = useCallback(() => setStores(getCmsStores()), []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) reload();
    });
    const on = () => {
      queueMicrotask(() => {
        if (!cancelled) reload();
      });
    };
    window.addEventListener("smg-storage", on);
    return () => {
      cancelled = true;
      window.removeEventListener("smg-storage", on);
    };
  }, [reload]);

  const persist = (next: CmsStore[]) => {
    saveCmsStores(next);
    setStores(next);
  };

  const update = (id: string, patch: Partial<CmsStore>) => {
    persist(stores.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addPreset = () => {
    const p = PRESETS.find((x) => x.id === preset);
    if (!p) return;
    if (stores.some((s) => s.id === p.id)) {
      alert("Cửa hàng này đã có trong danh sách.");
      return;
    }
    addCmsStore({
      id: p.id,
      name: p.name,
      cmsEndpoint: "",
      enabled: true,
      regionNote: p.hint,
    });
    reload();
  };

  const addCustom = () => {
    const name = customName.trim();
    const id = (customId.trim() || name.toLowerCase().replace(/\s+/g, "_")).replace(/[^\w-]/g, "");
    if (!name || !id) {
      alert("Nhập tên và mã id (slug) cho cửa hàng tùy chỉnh.");
      return;
    }
    if (stores.some((s) => s.id === id)) {
      alert("Mã id đã tồn tại.");
      return;
    }
    addCmsStore({
      id,
      name,
      cmsEndpoint: "",
      enabled: true,
      regionNote: "Tùy chỉnh",
    });
    setCustomName("");
    setCustomId("");
    reload();
  };

  return (
    <RequirePlatformAdmin>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cửa hàng & CMS</h1>
          <p className="mt-1 text-slate-600">
            Tài khoản chủ bật/tắt cửa hàng và ghi chú kết nối — nghệ sĩ chỉ thấy các cửa hàng đang bật khi phát hành. Phân phối DDEX/SFTP cấu hình trên{" "}
            <strong>backend</strong> (không lưu khóa bí mật trong trình duyệt). Tham chiếu{" "}
            <a href="https://kb.ddex.net/" className="text-cyan-700 underline" target="_blank" rel="noopener noreferrer">
              kb.ddex.net
            </a>
            .
          </p>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Checklist đối tác / SFTP (theo DDEX Integration Guide)</h2>
          <p className="mt-1 text-sm text-slate-700">
            SFTP đa host: đặt <code className="text-xs">DDEX_SFTP_TARGETS</code> trong <code className="text-xs">backend/.env</code> — mảng JSON, không giới hạn số
            tài khoản. Hoặc một host đơn qua <code className="text-xs">DDEX_SFTP_HOST</code>, <code className="text-xs">DDEX_SFTP_USER</code>,{" "}
            <code className="text-xs">DDEX_SFTP_PASSWORD</code>, <code className="text-xs">DDEX_SFTP_REMOTE_DIR</code>.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-cyan-100 bg-white p-3 text-xs text-slate-800">
            {`DDEX_SFTP_TARGETS=[{"host":"sftp1.example.com","port":22,"user":"inbox","password":"…","remoteDir":"/incoming","label":"DSP A"},{"host":"sftp2.example.com",...}]`}
          </pre>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-800">
            <li>
              <strong>Phiên bản ERN:</strong> ưu tiên 3.82 (<code className="text-xs">DDEX_ERN_VERSION=382</code>).
            </li>
            <li>
              <strong>DPID gửi:</strong> mặc định Soul <code className="text-xs">PADPIDA2025070802C</code> — ghi đè bằng <code className="text-xs">DDEX_SOUL_DPID</code> hoặc{" "}
              <code className="text-xs">DDEX_MESSAGE_SENDER_PARTY_ID</code>.
            </li>
            <li>
              <strong>Marker hoàn tất:</strong> <code className="text-xs">BatchComplete_yyyyMMddHHmmssfff.xml</code> trong thư mục gói (backend tự tạo sau khi đẩy file).
            </li>
            <li>
              <strong>Batch nội bộ:</strong> id lô <code className="text-xs">batch_100000</code>, … (file <code className="text-xs">data/ddex-batch-seq.json</code>).
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Thêm cửa hàng có sẵn</h2>
            <p className="mt-1 text-sm text-slate-500">Zing MP3, VK Music, Yandex Music, ZVUK, Kion…</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addPreset}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Thêm cửa hàng tùy chỉnh</h2>
            <p className="mt-1 text-sm text-slate-500">Khi có CMS riêng hoặc đối tác mới</p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="Tên hiển thị"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                placeholder="Mã id (slug), ví dụ: my_partner_dsp"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
              />
              <button
                type="button"
                onClick={addCustom}
                className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Thêm cửa hàng tùy chỉnh
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Danh sách kết nối</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stores.map((s) => (
              <div key={s.id} className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{s.id}</code>
                    {s.enabled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Đang bật</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Tắt</span>
                    )}
                  </div>
                  {s.regionNote && <p className="mt-1 text-xs text-slate-500">{s.regionNote}</p>}
                  <label className="mt-3 block text-xs font-medium text-slate-600">Ghi chú endpoint / webhook (tham chiếu nội bộ)</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                    placeholder="https://… (tuỳ chọn)"
                    value={s.cmsEndpoint}
                    onChange={(e) => update(s.id, { cmsEndpoint: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-cyan-600"
                      checked={s.enabled}
                      onChange={(e) => update(s.id, { enabled: e.target.checked })}
                    />
                    Nghệ sĩ có thể chọn khi phát hành
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:underline"
                    onClick={() => {
                      saveCmsStores(getCmsStores());
                      alert("Đã lưu cấu hình cửa hàng.");
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Lưu dòng này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="flex items-start gap-2 text-sm text-slate-500">
          <Plug className="mt-0.5 h-4 w-4 shrink-0" />
          Sau QC: gửi ERN qua HTTP và/hoặc SFTP — xem <code className="text-xs">docs/DEPLOYMENT.md</code> và biến môi trường trong repo.
        </p>
      </div>
    </RequirePlatformAdmin>
  );
}
