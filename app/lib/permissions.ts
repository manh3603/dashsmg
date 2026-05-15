import type { MessageKey } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n/messages";
import type { AccountRole } from "@/lib/smg-storage";

export function isPlatformAdmin(role: AccountRole | null): boolean {
  return role === "platform_admin";
}

export function isCustomerAdmin(role: AccountRole | null): boolean {
  return role === "customer_admin";
}

/** QC & duyệt release — chỉ quản trị nền tảng OMG. */
export function canAccessQc(role: AccountRole | null): boolean {
  return role === "platform_admin";
}

/** Label tạo / quản lý tài khoản nghệ sĩ con (sub-account). */
export function canManageLabelArtists(role: AccountRole | null): boolean {
  return role === "customer_admin";
}

/** Tài chính / thu nhập / phân tích doanh thu — không dành cho vai trò nghệ sĩ. */
export function canAccessFinancialReports(role: AccountRole | null): boolean {
  return role === "platform_admin" || role === "customer_admin";
}

/** Cấu hình CMS cửa hàng & tích hợp — chỉ admin nền tảng. */
export function canAccessStoreCms(role: AccountRole | null): boolean {
  return role === "platform_admin";
}

/** Quản lý danh sách tài khoản trên API — chỉ admin nền tảng. */
export function canManageAccounts(role: AccountRole | null): boolean {
  return role === "platform_admin";
}

function roleMessageKey(role: AccountRole | null): MessageKey {
  switch (role) {
    case "platform_admin":
      return "role.platform_admin";
    case "customer_admin":
      return "role.customer_admin";
    case "artist":
      return "role.artist";
    default:
      return "role.unknown";
  }
}

export function roleDisplayLabel(role: AccountRole | null, locale: Locale = "vi"): string {
  return translate(locale, roleMessageKey(role));
}
