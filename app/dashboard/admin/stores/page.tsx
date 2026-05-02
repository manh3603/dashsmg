"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Plug } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import type { CmsStore } from "@/lib/smg-storage";
import {
  addCmsStore,
  getCmsStores,
  getPartnerSftpConfig,
  saveCmsStores,
  savePartnerSftpConfig,
  type PartnerSftpConfig,
} from "@/lib/smg-storage";

/** Khớp `backend/env.example` — PADPIDA / URL gửi ERN theo từng cửa hàng CIS. */
const PRESETS: { id: string; name: string; hint: string }[] = [
  {
    id: "zing_mp3",
    name: "Zing MP3",
    hint: "HTTP POST ERN: CIS_DELIVERY_ZING_MP3_URL + CIS_DELIVERY_ZING_MP3_API_KEY. Party: DDEX_PARTY_ZING_ID / DDEX_PARTY_ZING_NAME. Chi tiết deal lấy từ đối tác.",
  },
  {
    id: "vk_music",
    name: "VK Music",
    hint: "CIS_DELIVERY_VK_MUSIC_URL + CIS_DELIVERY_VK_MUSIC_API_KEY. Party: DDEX_PARTY_VK_ID / DDEX_PARTY_VK_NAME.",
  },
  {
    id: "yandex_music",
    name: "Yandex Music",
    hint: "CIS_DELIVERY_YANDEX_MUSIC_URL + CIS_DELIVERY_YANDEX_MUSIC_API_KEY. Party: DDEX_PARTY_YANDEX_ID / DDEX_PARTY_YANDEX_NAME.",
  },
  {
    id: "zvuk",
    name: "ZVUK",
    hint: "CIS_DELIVERY_ZVUK_URL + CIS_DELIVERY_ZVUK_API_KEY. Party: DDEX_PARTY_ZVUK_ID / DDEX_PARTY_ZVUK_NAME.",
  },
  {
    id: "kion_music",
    name: "Kion Music",
    hint: "CIS_DELIVERY_KION_MUSIC_URL + CIS_DELIVERY_KION_MUSIC_API_KEY. Party: DDEX_PARTY_KION_ID / DDEX_PARTY_KION_NAME.",
  },
];

export default function AdminStoresPage() {
  const [stores, setStores] = useState<CmsStore[]>([]);
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [customName, setCustomName] = useState("");
  const [customId, setCustomId] = useState("");
  const [sftp, setSftp] = useState<PartnerSftpConfig>(() => getPartnerSftpConfig());

  const reload = useCallback(() => setStores(getCmsStores()), []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) reload();
    });
    const on = () => {
      queueMicrotask(() => {
        if (!cancelled) {
          reload();
          setSftp(getPartnerSftpConfig());
        }
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
            Tài khoản chủ bật/tắt cửa hàng, cấu hình endpoint CMS và khóa API — nghệ sĩ chỉ thấy các cửa hàng đang bật khi phát hành. Chuẩn kỹ thuật giao DDEX
            đồng bộ với tài liệu <strong>DDEX Integration Guide</strong> (ERN 3.82 ưu tiên; tham chiếu{" "}
            <a href="https://kb.ddex.net/" className="text-cyan-700 underline" target="_blank" rel="noopener noreferrer">
              kb.ddex.net
            </a>
            ).
          </p>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Checklist đối tác / SFTP (theo DDEX Integration Guide)</h2>
          <p className="mt-1 text-sm text-slate-700">
            Tóm tắt yêu cầu giao tiếp với hệ thống nhận DDEX — cấu hình thật đặt trong <code className="text-xs">backend/.env</code> và deal
            với đối tác.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-800">
            <li>
              <strong>Phiên bản ERN:</strong> hỗ trợ 3.71 / 3.82 / 3.83 — <strong>ưu tiên 3.82</strong> (dự án mặc định <code className="text-xs">DDEX_ERN_VERSION=382</code>).
            </li>
            <li>
              <strong>SFTP / FTP:</strong> mọi gói gửi lên dịch vụ SFTP của đối tác; cần <strong>IP tĩnh</strong> nguồn kết nối (khai báo trước).
            </li>
            <li>
              <strong>Thư mục gói:</strong> tên folder theo <code className="text-xs">yyyyMMddHHmmssfff</code> (thời điểm gói). Nên ≤ 100 sản phẩm / gói.
            </li>
            <li>
              <strong>Marker hoàn tất:</strong> sau khi ghi xong nội dung, tạo file{" "}
              <code className="text-xs">BatchComplete_yyyyMMddHHmmssfff.xml</code> (có thể rỗng) —{" "}
              <strong>ghi cuối cùng</strong>; xử lý chỉ bắt đầu khi có marker.
            </li>
            <li>
              <strong>XML sản phẩm:</strong> nên ghi file XML <strong>sau cùng</strong> trong thư mục sản phẩm, sau tất cả file nội dung.
            </li>
            <li>
              <strong>Lỗi:</strong> nếu có lỗi, đối tác có thể đặt <code className="text-xs">delivery.error</code> trong folder sản phẩm. Sửa lỗi gửi lại
              trong gói mới — <strong>phải kèm lại file nội dung</strong>, không tái dùng nội dung gói cũ.
            </li>
            <li>
              <strong>Album (main release):</strong> chỉ chấp nhận có <strong>ICPN/UPC-EAN</strong>; P-line &amp; C-line bắt buộc; tổng duration album =
              tổng duration track.
            </li>
            <li>
              <strong>SoundRecording:</strong> ISRC hợp lệ; ít nhất một <code className="text-xs">DisplayArtist</code> vai trò MainArtist; có ngày phát
              hành gốc (OriginalReleaseDate / ReleaseDate / GlobalReleaseDate).
            </li>
            <li>
              <strong>Ảnh bìa:</strong> <strong>3000×3000</strong> px, <strong>JPEG</strong>, <strong>RGB</strong> — không tự resize / đổi định dạng.
            </li>
            <li>
              <strong>Audio:</strong> WAV/FLAC chuẩn 44.1/48/96 kHz, 16/24-bit như guide; <strong>không mono</strong>; lệch duration metadata vs file ≤
              1s ngắn hơn / 3s dài hơn.
            </li>
            <li>
              <strong>Vòng đời:</strong> hỗ trợ Release → Update → <strong>Takedown</strong> (EndDateTime, tag Takedown, hoặc thiếu Deal / DealList —
              hiệu lực theo ngày nhận; không xử lý backdate).
            </li>
            <li>
              <strong>UGV (User Generated Video):</strong> trong Deal cần <code className="text-xs">CommercialModelType UserDefined</code> theo namespace
              deal — backend có cờ <code className="text-xs">DDEX_INCLUDE_UGV_DEAL</code>.
            </li>
            <li>
              <strong>Kiểm thử:</strong> ~10 sản phẩm đa dạng metadata; giai đoạn cuối phối hợp <strong>giao DSP</strong> trước với đối tác.
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-600">
            UI phía trên lưu endpoint CMS / cờ bật cửa hàng (demo). Biến <code className="text-xs">CIS_DELIVERY_*</code>, <code className="text-xs">DDEX_PARTY_*</code>,{" "}
            <code className="text-xs">DDEX_SFTP_*</code> phải khớp hợp đồng và PADPIDA đối tác.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Thêm cửa hàng có sẵn</h2>
            <p className="mt-1 text-sm text-slate-500">Zing MP3, VK Music, Yandex Music, ZVUK, Kion…</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
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
                  <label className="mt-3 block text-xs font-medium text-slate-600">Endpoint CMS / webhook</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                    placeholder="https://cms.example.com/v1/delivery"
                    value={s.cmsEndpoint}
                    onChange={(e) => update(s.id, { cmsEndpoint: e.target.value })}
                  />
                  <label className="mt-3 block text-xs font-medium text-slate-600">API key / secret (lưu cục bộ demo)</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                    placeholder={s.apiKeySet ? "•••••••• (đã lưu)" : "Nhập khóa"}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) update(s.id, { apiKeySet: true });
                    }}
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
                      alert("Đã lưu cấu hình (demo — production cần backend mã hóa secret).");
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

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">SFTP đối tác (DDEX)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lưu tham chiếu cục bộ (demo). Gửi thật qua SFTP: đặt <code className="text-xs">DDEX_SFTP_HOST</code>,{" "}
            <code className="text-xs">DDEX_SFTP_PORT</code>, <code className="text-xs">DDEX_SFTP_USER</code>,{" "}
            <code className="text-xs">DDEX_SFTP_PASSWORD</code>, <code className="text-xs">DDEX_SFTP_REMOTE_DIR</code> trong{" "}
            <code className="text-xs">backend/.env</code> — pipeline đẩy file ERN theo deal đối tác.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Host</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                value={sftp.host}
                onChange={(e) => setSftp((s) => ({ ...s, host: e.target.value }))}
                placeholder="sftp.partner.example"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Cổng</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                value={sftp.port}
                onChange={(e) => setSftp((s) => ({ ...s, port: Number(e.target.value) || 22 }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">User</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                value={sftp.username}
                onChange={(e) => setSftp((s) => ({ ...s, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Mật khẩu (chỉ cờ đã nhập)</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                placeholder={sftp.passwordSet ? "••••••••" : ""}
                onBlur={(e) => {
                  if (e.target.value.trim()) setSftp((s) => ({ ...s, passwordSet: true }));
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Thư mục đích</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                value={sftp.remotePath}
                onChange={(e) => setSftp((s) => ({ ...s, remotePath: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Ghi chú nội bộ</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={sftp.note}
                onChange={(e) => setSftp((s) => ({ ...s, note: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="button"
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => {
              savePartnerSftpConfig(sftp);
              alert("Đã lưu cấu hình SFTP (cục bộ). Production: dùng biến môi trường backend như trên.");
            }}
          >
            Lưu SFTP
          </button>
        </div>

        <p className="flex items-start gap-2 text-sm text-slate-500">
          <Plug className="mt-0.5 h-4 w-4 shrink-0" />
          Sau QC, gửi ERN/DDEX qua HTTP (<code className="text-xs">CIS_DELIVERY_*</code>) và/hoặc gói SFTP (marker <code className="text-xs">BatchComplete_*</code>, quy tắc
          thư mục) theo <strong>DDEX Integration Guide</strong> và hợp đồng. Triển khai public: xem <code className="text-xs">docs/DEPLOYMENT.md</code> trong repo.
        </p>
      </div>
    </RequirePlatformAdmin>
  );
}
