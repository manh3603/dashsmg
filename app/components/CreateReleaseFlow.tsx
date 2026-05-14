"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  Music,
  Image as ImageIcon,
  UploadCloud,
  Calendar,
  Disc3,
  Store,
  Globe,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  getActiveStoreOptions,
  getApiSessionToken,
  getCatalogItemById,
  resubmitReleaseToQC,
  submitReleaseToQC,
} from "@/lib/smg-storage";
import {
  fetchDeliveryStatus,
  isBackendConfigured,
  postCisDeliveryPush,
  postIsrcNext,
  postUpcNext,
  pushCatalogItemToBackend,
  uploadReleaseAsset,
  type ReleaseTableRow,
} from "@/lib/backend-api";
import { catalogItemToDisplayTable } from "@/lib/catalog-table";
import { isCisStoreId } from "@/lib/cis-stores";
import {
  isPlaceholderIsrc,
  isPlaceholderUpc,
  isValidIsrc,
  isValidUpcGtin,
} from "@/lib/release-validation";

type ReleaseKind = "single" | "album_ep" | null;

const STEPS = [
  { id: 1, label: "Loại phát hành", icon: Disc3 },
  { id: 2, label: "Thông tin chung", icon: Music },
  { id: 3, label: "Tải lên", icon: UploadCloud },
  { id: 4, label: "Siêu dữ liệu", icon: FileText },
  { id: 5, label: "Cửa hàng & lãnh thổ", icon: Store },
  { id: 6, label: "Lịch phát hành", icon: Calendar },
  { id: 7, label: "Xem lại & Gửi", icon: CheckCircle },
] as const;

const LANGS = ["Tiếng Việt", "English", "Instrumental", "Khác"];
const GENRES_MAIN = ["EDM", "Phonk", "Vina House", "Pop", "Hip-hop", "Rock", "Khác"];
const GENRES_SUB = ["House", "Techno", "Melodic", "Drill", "Lo-fi", "Không có"];

export default function CreateReleaseFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit")?.trim() || null;
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  /** Một lần tự cấp ISRC cho mỗi (editId + bước 4); reset khi lùi khỏi bước 4. */
  const lastIsrcAutoKeyRef = useRef<string | null>(null);
  /** Album/EP — tự cấp UPC Soul tại bước 4 khi sửa bản ghi trống UPC. */
  const lastUpcAutoKeyRef = useRef<string | null>(null);
  /** Bài mới + Single: cấp ISRC ngay khi chọn loại (không chờ bước 4). */
  const earlyNewSingleIsrcRef = useRef<string | null>(null);
  /** Bài mới + Album/EP: cấp UPC Soul ngay khi chọn loại. */
  const earlyNewAlbumUpcRef = useRef<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [audioDrag, setAudioDrag] = useState(false);
  const [coverDrag, setCoverDrag] = useState(false);
  const [audioFileLabel, setAudioFileLabel] = useState<string | null>(null);
  const [coverFileLabel, setCoverFileLabel] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<{
    table: ReleaseTableRow[];
    backendSynced: boolean;
    backendError?: string;
    deliveryNote?: string;
    deliveryWarning?: boolean;
  } | null>(null);

  const [releaseKind, setReleaseKind] = useState<ReleaseKind>(null);
  const [formData, setFormData] = useState(() => ({
    productName: "",
    language: "Tiếng Việt",
    genreMain: "EDM",
    genreSub: "House",
    label: "",
    artistMain: "",
    artistFeatured: "",
    composer: "",
    isrc: "",
    upc: "",
    preorder: false,
    releaseDate: "",
    territories: "cis",
    audioAssetUrl: "",
    coverAssetUrl: "",
    pline: "",
    cline: "",
    version: "",
    stores: Object.fromEntries(getActiveStoreOptions().map((o) => [o.id, isCisStoreId(o.id)])) as Record<
      string,
      boolean
    >,
  }));

  const canNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return releaseKind !== null;
      case 2:
        return formData.productName.trim().length > 0 && formData.artistMain.trim().length > 0;
      case 3:
        return /^https?:\/\//i.test(formData.audioAssetUrl.trim());
      case 4:
        return releaseKind === "single"
          ? isValidIsrc(formData.isrc) && !isPlaceholderIsrc(formData.isrc)
          : isValidUpcGtin(formData.upc) && !isPlaceholderUpc(formData.upc);
      case 5:
        return Object.values(formData.stores).some(Boolean);
      case 6:
        return formData.releaseDate.length > 0;
      default:
        return true;
    }
  }, [currentStep, releaseKind, formData]);

  useEffect(() => {
    if (currentStep < 4) {
      lastIsrcAutoKeyRef.current = null;
      lastUpcAutoKeyRef.current = null;
    }
  }, [currentStep]);

  useEffect(() => {
    if (editId) return;
    if (releaseKind !== "single") {
      earlyNewSingleIsrcRef.current = null;
      return;
    }
    if (formData.isrc.trim()) return;
    if (!isBackendConfigured()) return;
    const tok = getApiSessionToken();
    if (!tok) return;
    const k = "early-new-single";
    if (earlyNewSingleIsrcRef.current === k) return;
    earlyNewSingleIsrcRef.current = k;
    void postIsrcNext(tok).then((r) => {
      if (!r.ok) {
        earlyNewSingleIsrcRef.current = null;
        return;
      }
      setFormData((fd) => (fd.isrc.trim() ? fd : { ...fd, isrc: r.isrc }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theo releaseKind / editId; tránh lặp khi gõ ISRC.
  }, [releaseKind, editId]);

  useEffect(() => {
    if (editId) return;
    if (releaseKind !== "album_ep") {
      earlyNewAlbumUpcRef.current = null;
      return;
    }
    if (formData.upc.trim()) return;
    if (!isBackendConfigured()) return;
    const tok = getApiSessionToken();
    if (!tok) return;
    const k = "early-new-album";
    if (earlyNewAlbumUpcRef.current === k) return;
    earlyNewAlbumUpcRef.current = k;
    void postUpcNext(tok).then((r) => {
      if (!r.ok) {
        earlyNewAlbumUpcRef.current = null;
        return;
      }
      setFormData((fd) => (fd.upc.trim() ? fd : { ...fd, upc: r.upc }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseKind, editId]);

  // Bài đang sửa: bước 4 mới cấp ISRC nếu trống (bài mới đã cấp ở effect «chọn Single»).
  useEffect(() => {
    if (currentStep !== 4 || releaseKind !== "single") return;
    if (!editId) return;
    if (formData.isrc.trim()) return;
    if (!isBackendConfigured()) return;
    const tok = getApiSessionToken();
    if (!tok) return;
    const dedupeKey = `${editId}-step4`;
    if (lastIsrcAutoKeyRef.current === dedupeKey) return;
    lastIsrcAutoKeyRef.current = dedupeKey;
    void postIsrcNext(tok).then((r) => {
      if (!r.ok) {
        lastIsrcAutoKeyRef.current = null;
        return;
      }
      setFormData((fd) => (fd.isrc.trim() ? fd : { ...fd, isrc: r.isrc }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, releaseKind, editId]);

  useEffect(() => {
    if (currentStep !== 4 || releaseKind !== "album_ep") return;
    if (!editId) return;
    if (formData.upc.trim()) return;
    if (!isBackendConfigured()) return;
    const tok = getApiSessionToken();
    if (!tok) return;
    const dedupeKey = `${editId}-step4-upc`;
    if (lastUpcAutoKeyRef.current === dedupeKey) return;
    lastUpcAutoKeyRef.current = dedupeKey;
    void postUpcNext(tok).then((r) => {
      if (!r.ok) {
        lastUpcAutoKeyRef.current = null;
        return;
      }
      setFormData((fd) => (fd.upc.trim() ? fd : { ...fd, upc: r.upc }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, releaseKind, editId]);

  useEffect(() => {
    const syncStores = () => {
      const opts = getActiveStoreOptions();
      setFormData((fd) => {
        const next: Record<string, boolean> = { ...fd.stores };
        for (const o of opts) {
          if (!(o.id in next)) next[o.id] = isCisStoreId(o.id);
        }
        for (const k of Object.keys(next)) {
          if (!opts.some((o) => o.id === k)) delete next[k];
        }
        return { ...fd, stores: next };
      });
    };
    syncStores();
    window.addEventListener("smg-storage", syncStores);
    return () => window.removeEventListener("smg-storage", syncStores);
  }, []);

  const [editLoadMissing, setEditLoadMissing] = useState(false);
  const [editQcNote, setEditQcNote] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    const loadFromCatalog = () => {
      const item = getCatalogItemById(editId);
      if (!item) {
        setEditLoadMissing(true);
        setEditQcNote(null);
        return;
      }
      setEditLoadMissing(false);
      setReleaseKind(item.type === "Album/EP" ? "album_ep" : "single");
      const opts = getActiveStoreOptions();
      const storeMap: Record<string, boolean> = {};
      for (const o of opts) {
        storeMap[o.id] = item.storesSelected?.length
          ? Boolean(item.storesSelected.includes(o.id))
          : isCisStoreId(o.id);
      }
      setFormData({
        productName: item.title,
        language: item.language ?? "Tiếng Việt",
        genreMain: item.genreMain ?? "EDM",
        genreSub: item.genreSub ?? "House",
        label: item.labelName ?? "",
        artistMain: item.artist ?? "",
        artistFeatured: item.artistFeatured ?? "",
        composer: item.composer ?? "",
        isrc: item.isrc === "—" ? "" : item.isrc,
        upc: item.upc === "—" ? "" : item.upc,
        preorder: item.preorder ?? false,
        releaseDate: item.releaseDate ?? "",
        territories: item.territories ?? "cis",
        audioAssetUrl: item.audioAssetUrl ?? "",
        coverAssetUrl: item.coverAssetUrl ?? "",
        pline: item.pline ?? "",
        cline: item.cline ?? "",
        version: item.version ?? "",
        stores: storeMap,
      });
      setAudioFileLabel(item.audioAssetUrl?.trim() ? "Đã có URL âm thanh" : null);
      setCoverFileLabel(item.coverAssetUrl?.trim() ? "Đã có ảnh bìa" : null);
      setEditQcNote(item.qcFeedback?.trim() || null);
      setCurrentStep(2);
    };
    loadFromCatalog();
    window.addEventListener("smg-storage", loadFromCatalog);
    return () => window.removeEventListener("smg-storage", loadFromCatalog);
  }, [editId]);

  const handleNextStep = () => {
    if (!canNext) return;
    setIsLoading(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setIsLoading(false);
    }, 400);
  };

  const handlePrevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const runAudioUpload = async (file: File) => {
    if (!isBackendConfigured()) {
      setUploadErr("Cần backend: chạy «npm run dev:all» (API qua /smg-api) để upload file phục vụ DDEX.");
      return;
    }
    setUploadErr(null);
    setAudioUploading(true);
    const r = await uploadReleaseAsset("audio", file);
    setAudioUploading(false);
    if (!r.ok) {
      setUploadErr(r.error ?? "Upload âm thanh thất bại");
      return;
    }
    if (r.url) {
      setFormData((fd) => ({ ...fd, audioAssetUrl: r.url! }));
      setAudioFileLabel(file.name);
    }
  };

  const fetchNextIsrc = async () => {
    if (!isBackendConfigured()) {
      setUploadErr("Cần backend để cấp ISRC. Chạy «npm run dev:all» hoặc đăng nhập lại để lấy phiên API.");
      return;
    }
    const tok = getApiSessionToken();
    if (!tok) {
      setUploadErr("Đăng xuất và đăng nhập lại để cấp ISRC tự động từ kho hệ thống.");
      return;
    }
    setUploadErr(null);
    const r = await postIsrcNext(tok);
    if (!r.ok) {
      setUploadErr(r.error);
      return;
    }
    setFormData((fd) => ({ ...fd, isrc: r.isrc }));
  };

  const fetchNextUpc = async () => {
    if (!isBackendConfigured()) {
      setUploadErr("Cần backend để cấp UPC. Chạy «npm run dev:all» hoặc đăng nhập lại để lấy phiên API.");
      return;
    }
    const tok = getApiSessionToken();
    if (!tok) {
      setUploadErr("Đăng xuất và đăng nhập lại để cấp UPC tự động từ kho hệ thống.");
      return;
    }
    setUploadErr(null);
    const r = await postUpcNext(tok);
    if (!r.ok) {
      setUploadErr(r.error);
      return;
    }
    setFormData((fd) => ({ ...fd, upc: r.upc }));
  };

  const runCoverUpload = async (file: File) => {
    if (!isBackendConfigured()) {
      setUploadErr("Cần backend: chạy «npm run dev:all» để upload ảnh bìa.");
      return;
    }
    setUploadErr(null);
    setCoverUploading(true);
    const r = await uploadReleaseAsset("cover", file);
    setCoverUploading(false);
    if (!r.ok) {
      setUploadErr(r.error ?? "Upload ảnh bìa thất bại");
      return;
    }
    if (r.url) {
      setFormData((fd) => ({ ...fd, coverAssetUrl: r.url! }));
      setCoverFileLabel(file.name);
    }
  };

  const handleSubmit = () => {
    if (!releaseKind) return;
    if (releaseKind === "single") {
      if (!isValidIsrc(formData.isrc) || isPlaceholderIsrc(formData.isrc)) {
        setSubmitModal({
          table: [],
          backendSynced: false,
          deliveryNote:
            "Single cần ISRC hợp lệ: 12 ký tự chữ/số (có thể có dấu gạnh), ví dụ VN-A01-24-00001.",
          deliveryWarning: true,
        });
        return;
      }
    } else if (!isValidUpcGtin(formData.upc) || isPlaceholderUpc(formData.upc)) {
      setSubmitModal({
        table: [],
        backendSynced: false,
        deliveryNote: "Album/EP cần UPC/GTIN-13: 12–13 chữ số.",
        deliveryWarning: true,
      });
      return;
    }
    setIsLoading(true);
    setTimeout(async () => {
      const item = editId
        ? resubmitReleaseToQC(editId, { releaseKind, form: formData })
        : submitReleaseToQC({ releaseKind, form: formData });
      if (!item) {
        setIsLoading(false);
        setSubmitModal({
          table: [],
          backendSynced: false,
          deliveryNote: "Không tìm thấy bản ghi để cập nhật. Kiểm tra kho nhạc hoặc hủy chế độ sửa.",
          deliveryWarning: true,
        });
        return;
      }
      let table: ReleaseTableRow[] = catalogItemToDisplayTable(item);
      let backendSynced = false;
      let backendError: string | undefined;
      let deliveryNote: string | undefined;
      let deliveryWarning = false;
      if (isBackendConfigured()) {
        const pr = await pushCatalogItemToBackend(item);
        backendSynced = pr.ok;
        backendError = pr.error;
        if (pr.ok && pr.table?.length) table = pr.table;
        if (pr.ok) {
          const hasArtistCis = item.storesSelected?.some((s) => isCisStoreId(s));
          const deliveryMeta = await fetchDeliveryStatus();
          const hasDealCis = Boolean(deliveryMeta?.activeDealCisStoreKeys?.length);
          if (hasArtistCis || hasDealCis) {
            const d = await postCisDeliveryPush(item.id, { finalize: true, writeFiles: true });
            deliveryNote = d.ok
              ? "Đã gửi metadata (DDEX) lên các cửa hàng đã cấu hình trên server."
              : `Gửi cửa hàng chưa hoàn tất: ${d.message}`;
            deliveryWarning = !d.ok;
          } else {
            deliveryNote =
              "Không có cửa hàng DDEX (CIS) trong lựa chọn và không có cửa hàng nào từ deal đối tác đang hiệu lực — chỉ lưu hệ thống, không gửi metadata tự động.";
          }
        }
      }
      setIsLoading(false);
      setSubmitModal({
        table,
        backendSynced,
        backendError,
        deliveryNote,
        ...(deliveryWarning ? { deliveryWarning: true } : {}),
      });
    }, 400);
  };

  const closeSubmitModalAndGo = () => {
    setSubmitModal(null);
    router.push("/dashboard/catalog");
  };

  const toggleStore = (key: string) => {
    setFormData((f) => ({
      ...f,
      stores: { ...f.stores, [key]: !f.stores[key] },
    }));
  };

  const setAllStores = (selected: boolean) => {
    setFormData((f) => {
      const next = { ...f.stores };
      for (const o of getActiveStoreOptions()) {
        next[o.id] = selected;
      }
      return { ...f, stores: next };
    });
  };

  const selectAllDdexPartners = () => {
    setFormData((f) => {
      const next = { ...f.stores };
      for (const o of getActiveStoreOptions()) {
        if (isCisStoreId(o.id)) next[o.id] = true;
      }
      return { ...f, stores: next };
    });
  };

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-slate-900">Phát hành nhạc</h2>
      <p className="mt-1 text-slate-600">
        Điền thông tin và gửi — hệ thống lưu và <strong>tự gửi metadata lên cửa hàng</strong> bạn đã chọn (theo cấu hình trên
        server). Chi tiết hợp đồng / deal xử lý phía đối tác.
      </p>
      {editId && editLoadMissing ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-medium">Không tìm thấy bản ghi trong kho nhạc.</p>
          <p className="mt-1 text-red-900/90">
            Có thể dữ liệu vừa đồng bộ hoặc ID không còn — mở{" "}
            <button type="button" className="font-semibold underline" onClick={() => router.push("/dashboard/catalog")}>
              Kho nhạc
            </button>{" "}
            để kiểm tra, hoặc tải lại trang.
          </p>
        </div>
      ) : null}
      {editId && !editLoadMissing ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span>
            Đang sửa bản ghi <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">{editId}</code> — gửi sẽ đặt lại{" "}
            <strong>Chờ QC</strong>.
          </span>
          <button
            type="button"
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            onClick={() => router.push("/dashboard/distribute")}
          >
            Hủy sửa
          </button>
        </div>
      ) : null}
      {editId && !editLoadMissing && editQcNote ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-medium text-red-900">Phản hồi từ QC</p>
          <p className="mt-1 whitespace-pre-wrap text-red-900/90">{editQcNote}</p>
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-w-[640px] items-start justify-between gap-1">
          {STEPS.map((item, idx) => {
            const active = currentStep >= item.id;
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                <button
                  type="button"
                  onClick={() => item.id <= currentStep && setCurrentStep(item.id)}
                  className="flex flex-1 flex-col items-center text-center"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors ${
                      active ? "bg-cyan-600" : "bg-slate-300"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`mt-2 max-w-[88px] text-xs font-medium leading-tight ${
                      active ? "text-cyan-700" : "text-slate-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex flex-1 items-center pt-5">
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-8 min-h-[320px] border-t border-slate-100 pt-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Chọn loại phát hành</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReleaseKind("single")}
                className={`rounded-xl border-2 p-6 text-left transition-all ${
                  releaseKind === "single" ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Music className="mb-2 h-8 w-8 text-cyan-600" />
                <p className="font-semibold text-slate-900">Single</p>
                <p className="mt-1 text-sm text-slate-600">Một bài — một ISRC</p>
              </button>
              <button
                type="button"
                onClick={() => setReleaseKind("album_ep")}
                className={`rounded-xl border-2 p-6 text-left transition-all ${
                  releaseKind === "album_ep" ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Disc3 className="mb-2 h-8 w-8 text-cyan-600" />
                <p className="font-semibold text-slate-900">Album / EP</p>
                <p className="mt-1 text-sm text-slate-600">Nhiều track — một UPC</p>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Bước 1 — Thông tin chung</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên sản phẩm *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Tên single hoặc album"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên nghệ sĩ (chính) *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="VD: Nguyễn A"
                value={formData.artistMain}
                onChange={(e) => setFormData({ ...formData, artistMain: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nghệ sĩ kết hợp (feat.)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                placeholder="Để trống nếu không có — gửi kèm trong DDEX (FeaturedArtist)"
                value={formData.artistFeatured}
                onChange={(e) => setFormData({ ...formData, artistFeatured: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phiên bản (Version)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                placeholder="VD: Radio Edit, Extended Mix, Instrumental…"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ngôn ngữ</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                >
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Label</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                  placeholder="Tên nhãn (nếu có)"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Thể loại chính</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                  value={formData.genreMain}
                  onChange={(e) => setFormData({ ...formData, genreMain: e.target.value })}
                >
                  {GENRES_MAIN.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Thể loại phụ</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                  value={formData.genreSub}
                  onChange={(e) => setFormData({ ...formData, genreSub: e.target.value })}
                >
                  {GENRES_SUB.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dòng ℗ (P-line)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
                  placeholder="℗ 2026 Tên nhãn hoặc chủ sở hữu bản ghi"
                  value={formData.pline}
                  onChange={(e) => setFormData({ ...formData, pline: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dòng © (C-line)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
                  placeholder="© 2026 Chủ sở hữu tác phẩm"
                  value={formData.cline}
                  onChange={(e) => setFormData({ ...formData, cline: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Bước 2 — Tải lên file hoặc dán URL</h3>
            <p className="text-sm text-slate-600">
              Kéo thả hoặc chọn file từ máy — file được lưu trên <strong>backend</strong> và tạo URL{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">https://</code> cho DDEX. Production: đặt{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">PUBLIC_BACKEND_URL</code> trỏ domain công khai.
            </p>
            {uploadErr && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{uploadErr}</p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">File âm thanh * (WAV / FLAC / MP3)</p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") audioInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setAudioDrag(true);
                }}
                onDragLeave={() => setAudioDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setAudioDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void runAudioUpload(f);
                }}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  audioDrag ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <UploadCloud className="mx-auto h-10 w-10 text-cyan-600" />
                <p className="mt-3 text-sm font-medium text-slate-800">Kéo thả file vào đây</p>
                <p className="mt-1 text-xs text-slate-500">hoặc</p>
                <button
                  type="button"
                  disabled={audioUploading}
                  onClick={() => audioInputRef.current?.click()}
                  className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {audioUploading ? "Đang tải lên…" : "Chọn file từ máy tính"}
                </button>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".wav,.flac,.mp3,audio/wav,audio/flac,audio/mpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void runAudioUpload(f);
                    e.target.value = "";
                  }}
                />
                {audioFileLabel && (
                  <p className="mt-3 text-xs text-emerald-700">
                    Đã chọn: <span className="font-mono">{audioFileLabel}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Ảnh bìa (JPG / PNG / WEBP — khuyến nghị)</p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") coverInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setCoverDrag(true);
                }}
                onDragLeave={() => setCoverDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCoverDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void runCoverUpload(f);
                }}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  coverDrag ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <ImageIcon className="mx-auto h-8 w-8 text-violet-600" />
                <p className="mt-2 text-sm text-slate-700">Kéo thả ảnh bìa hoặc</p>
                <button
                  type="button"
                  disabled={coverUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-2 text-sm font-medium text-violet-700 underline disabled:opacity-50"
                >
                  {coverUploading ? "Đang tải…" : "chọn file"}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void runCoverUpload(f);
                    e.target.value = "";
                  }}
                />
                {coverFileLabel && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Đã chọn: <span className="font-mono">{coverFileLabel}</span>
                  </p>
                )}
              </div>
            </div>

            <details className="rounded-lg border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
                Hoặc dán URL (CDN / S3 của bạn)
              </summary>
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">URL file âm thanh *</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900"
                    placeholder="https://cdn.example.com/tracks/master.wav"
                    value={formData.audioAssetUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, audioAssetUrl: e.target.value });
                      if (!e.target.value) setAudioFileLabel(null);
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">URL ảnh bìa</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900"
                    placeholder="https://cdn.example.com/covers/3000.jpg"
                    value={formData.coverAssetUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, coverAssetUrl: e.target.value });
                      if (!e.target.value) setCoverFileLabel(null);
                    }}
                  />
                </div>
              </div>
            </details>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Bước 3 — Mã định danh &amp; soạn giả</h3>
            <p className="text-sm text-slate-600">
              Tên nghệ sĩ, feat., phiên bản, P-line và C-line đã nhập ở bước <strong>Thông tin chung</strong>.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Soạn giả / nhà soạn nhạc</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                placeholder="Tuỳ chọn — ghi chú trong ERN nếu cần bổ sung sau"
                value={formData.composer}
                onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-slate-700">
                    ISRC {releaseKind === "single" ? "*" : ""}
                  </label>
                  {releaseKind === "single" && (
                    <button
                      type="button"
                      onClick={() => void fetchNextIsrc()}
                      className="text-xs font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900"
                    >
                      Lấy ISRC tiếp theo từ kho (VNE0M26…)
                    </button>
                  )}
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Single: ISRC được cấp tự động ngay khi chọn loại phát hành (bài mới) và bổ sung ở bước này nếu cần — cần đăng nhập có phiên API.
                </p>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900"
                  placeholder="VNE0M2603000"
                  value={formData.isrc}
                  onChange={(e) => setFormData({ ...formData, isrc: e.target.value })}
                />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-slate-700">
                    UPC/GTIN {releaseKind === "album_ep" ? "*" : ""}
                  </label>
                  {releaseKind === "album_ep" && (
                    <button
                      type="button"
                      onClick={() => void fetchNextUpc()}
                      className="text-xs font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900"
                    >
                      Lấy UPC Soul (893274 + EAN-13)
                    </button>
                  )}
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Album/EP: GTIN-13 — 893 (VN) + 274 (Soul) + Item Reference 000001–999999 + số kiểm EAN-13. Tự điền khi chọn Album (có phiên API) giống ISRC cho Single.
                </p>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900"
                  placeholder="13 chữ số (EAN-13)"
                  value={formData.upc}
                  onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Bước 4 — Cửa hàng & khu vực</h3>
            <p className="text-sm text-slate-500">
              Chọn nền tảng bằng danh sách tích chọn. Backend đẩy DDEX qua HTTP (nếu có <code className="rounded bg-slate-100 px-1 text-xs">CIS_DELIVERY_*_URL</code>) và
              lên <strong>mọi</strong> tài khoản SFTP đã cấu hình trên server.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectAllDdexPartners()}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100"
              >
                Chọn tất cả đối tác DDEX
              </button>
              <button
                type="button"
                onClick={() => setAllStores(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                Chọn tất cả cửa hàng
              </button>
              <button
                type="button"
                onClick={() => setAllStores(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Bỏ chọn hết
              </button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Đối tác DDEX (CIS, Zing MP3…)</label>
              {getActiveStoreOptions().filter((o) => isCisStoreId(o.id)).length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                  Quản trị cần thêm &amp; bật ít nhất một cửa hàng DDEX trong mục Cửa hàng &amp; CMS (ví dụ Zing MP3, VK…).
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                  {getActiveStoreOptions()
                    .filter((o) => isCisStoreId(o.id))
                    .map(({ id, name }) => (
                      <li key={id} className="flex items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          id={`store-ddex-${id}`}
                          className="h-4 w-4 accent-violet-600"
                          checked={Boolean(formData.stores[id])}
                          onChange={() => toggleStore(id)}
                        />
                        <label htmlFor={`store-ddex-${id}`} className="flex-1 cursor-pointer text-sm text-slate-800">
                          <span className="font-medium">{name}</span>{" "}
                          <code className="ml-1 rounded bg-white px-1 text-xs text-slate-500">{id}</code>
                        </label>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Cửa hàng khác</label>
              {getActiveStoreOptions().filter((o) => !isCisStoreId(o.id)).length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có cửa hàng khác được bật.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                  {getActiveStoreOptions()
                    .filter((o) => !isCisStoreId(o.id))
                    .map(({ id, name }) => (
                      <li key={id} className="flex items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          id={`store-other-${id}`}
                          className="h-4 w-4 accent-cyan-600"
                          checked={Boolean(formData.stores[id])}
                          onChange={() => toggleStore(id)}
                        />
                        <label htmlFor={`store-other-${id}`} className="flex-1 cursor-pointer text-sm text-slate-800">
                          <span className="font-medium">{name}</span>{" "}
                          <code className="ml-1 rounded bg-white px-1 text-xs text-slate-500">{id}</code>
                        </label>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Globe className="h-4 w-4" />
                Lãnh thổ phân phối
              </label>
              <select
                className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                value={formData.territories}
                onChange={(e) => setFormData({ ...formData, territories: e.target.value })}
              >
                <option value="cis">Nga &amp; CIS (RU, BY, KZ… — VK / Yandex / ZVUK / Kion)</option>
                <option value="vn">Việt Nam (Zing MP3 và thị trường VN)</option>
                <option value="worldwide">Toàn cầu</option>
                <option value="sea">Đông Nam Á</option>
                <option value="custom">Tùy chỉnh (chọn từng quốc gia sau)</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Bước 5 — Lịch phát hành</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày ra mắt *</label>
              <input
                type="date"
                className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cyan-600"
                checked={formData.preorder}
                onChange={(e) => setFormData({ ...formData, preorder: e.target.checked })}
              />
              Bật đặt trước (pre-order) trên các cửa hàng hỗ trợ
            </label>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Bước 6 — Kiểm tra & gửi duyệt</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <dt className="text-slate-500">Loại</dt>
              <dd className="font-medium text-slate-900">{releaseKind === "single" ? "Single" : "Album / EP"}</dd>
              <dt className="text-slate-500">Tên sản phẩm</dt>
              <dd className="font-medium text-slate-900">{formData.productName || "—"}</dd>
              <dt className="text-slate-500">Ngôn ngữ / Thể loại</dt>
              <dd className="text-slate-900">
                {formData.language} · {formData.genreMain} / {formData.genreSub}
              </dd>
              <dt className="text-slate-500">Nghệ sĩ</dt>
              <dd className="text-slate-900">
                {formData.artistMain}
                {formData.artistFeatured ? ` feat. ${formData.artistFeatured}` : ""}
              </dd>
              <dt className="text-slate-500">Phiên bản</dt>
              <dd className="text-slate-900">{formData.version.trim() || "—"}</dd>
              <dt className="text-slate-500">Label</dt>
              <dd className="text-slate-900">{formData.label.trim() || "—"}</dd>
              <dt className="text-slate-500">P-line / C-line</dt>
              <dd className="text-slate-900">
                {formData.pline.trim() || "—"} · {formData.cline.trim() || "—"}
              </dd>
              <dt className="text-slate-500">Soạn giả</dt>
              <dd className="text-slate-900">{formData.composer.trim() || "—"}</dd>
              <dt className="text-slate-500">{releaseKind === "single" ? "ISRC" : "UPC"}</dt>
              <dd className="font-mono text-xs text-slate-900">
                {releaseKind === "single" ? formData.isrc || "—" : formData.upc || "—"}
              </dd>
              <dt className="text-slate-500">Ngày phát hành</dt>
              <dd className="text-slate-900">{formData.releaseDate || "—"}</dd>
              <dt className="text-slate-500">Khu vực phân phối</dt>
              <dd className="text-slate-900">{formData.territories}</dd>
              <dt className="text-slate-500">URL âm thanh</dt>
              <dd className="break-all font-mono text-xs text-slate-900">
                {audioFileLabel ? `${audioFileLabel} → ` : ""}
                {formData.audioAssetUrl || "—"}
              </dd>
              <dt className="text-slate-500">Pre-order</dt>
              <dd className="text-slate-900">{formData.preorder ? "Có" : "Không"}</dd>
            </dl>
          </div>
        )}
      </div>

      {submitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 id="submit-modal-title" className="text-lg font-semibold text-slate-900">
                {submitModal.table.length === 0 && submitModal.deliveryWarning
                  ? "Kiểm tra trước khi gửi"
                  : "Đã gửi trình duyệt"}
              </h3>
              {submitModal.table.length > 0 || !submitModal.deliveryWarning ? (
                <p className="mt-1 text-sm text-slate-600">
                  Trạng thái: <strong>Chờ QC SMG</strong>. Bảng dữ liệu đã lưu:
                </p>
              ) : null}
              {submitModal.deliveryNote && (
                <p
                  className={`mt-2 text-sm ${submitModal.deliveryWarning ? "text-red-800" : "text-emerald-700"}`}
                >
                  {submitModal.deliveryNote}
                </p>
              )}
              {submitModal.table.length > 0 ? (
                <>
                  {submitModal.backendSynced ? (
                    <p className="mt-2 text-sm text-emerald-700">Đã đồng bộ bản ghi lên backend.</p>
                  ) : isBackendConfigured() ? (
                    <p className="mt-2 text-sm text-amber-800">
                      Backend chưa lưu được: {submitModal.backendError ?? "lỗi không xác định"} — dữ liệu vẫn lưu cục bộ
                      (trình duyệt).
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      Chưa kết nối API — chỉ lưu cục bộ; bật backend («npm run dev:all») để đồng bộ.
                    </p>
                  )}
                </>
              ) : null}
            </div>
            {submitModal.table.length > 0 ? (
              <div className="max-h-[55vh] overflow-auto px-6 py-4">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="sticky top-0 py-2 pr-4 font-semibold text-slate-700">Trường</th>
                      <th className="sticky top-0 py-2 font-semibold text-slate-700">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submitModal.table.map((row) => (
                      <tr key={row.field} className="border-b border-slate-100">
                        <td className="align-top py-2 pr-4 font-medium text-slate-600">{row.field}</td>
                        <td className="break-all py-2 text-slate-900">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSubmitModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ở lại trang này
              </button>
              <button
                type="button"
                onClick={closeSubmitModalAndGo}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Đến kho nhạc
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || isLoading}
          className="rounded-lg border border-slate-200 px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Quay lại
        </button>
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={handleNextStep}
            disabled={isLoading || !canNext}
            className="rounded-lg bg-cyan-600 px-6 py-2.5 font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý…" : "Tiếp tục"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? "Đang gửi…" : "Gửi trình duyệt"}
          </button>
        )}
      </div>
    </div>
  );
}
