import type { CatalogItem } from "@/lib/smg-storage";

/** Giống logic `catalogItemToTable` backend — dùng khi không gọi được API */
export function catalogItemToDisplayTable(item: CatalogItem): { field: string; value: string }[] {
  const stores = item.storesSelected?.length ? item.storesSelected.join(", ") : "—";
  return [
    { field: "ID phát hành", value: item.id },
    { field: "Tiêu đề", value: item.title },
    { field: "Loại", value: item.type },
    { field: "Trạng thái", value: item.status },
    { field: "Ghi chú QC / lý do", value: item.qcFeedback?.trim() || "—" },
    { field: "ISRC", value: item.isrc },
    { field: "UPC", value: item.upc },
    { field: "Cập nhật", value: item.updated },
    { field: "Nghệ sĩ", value: item.artist ?? "—" },
    { field: "Cửa hàng đã chọn", value: stores },
    { field: "Label", value: item.labelName ?? "—" },
    { field: "Ngôn ngữ", value: item.language ?? "—" },
    { field: "Thể loại", value: [item.genreMain, item.genreSub].filter(Boolean).join(" / ") || "—" },
    { field: "Khu vực phân phối", value: item.territories ?? "—" },
    { field: "Ngày phát hành", value: item.releaseDate ?? "—" },
    { field: "Pre-order", value: item.preorder ? "Có" : "Không" },
    { field: "Soạn giả", value: item.composer ?? "—" },
    { field: "Feat.", value: item.artistFeatured ?? "—" },
    { field: "Phiên bản", value: item.version ?? "—" },
    { field: "URL âm thanh", value: item.audioAssetUrl ?? "—" },
    { field: "URL ảnh bìa", value: item.coverAssetUrl ?? "—" },
    { field: "P-line", value: item.pline ?? "—" },
    { field: "C-line", value: item.cline ?? "—" },
  ];
}
