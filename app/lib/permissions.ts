import type { AccountRole } from "@/lib/smg-storage";

export function isPlatformAdmin(role: AccountRole | null): boolean {
  return role === "platform_admin";
}

export function isCustomerAdmin(role: AccountRole | null): boolean {
  return role === "customer_admin";
}

/** QC & duyệt release — admin nền tảng hoặc admin khách hàng. */
export function canAccessQc(role: AccountRole | null): boolean {
  return role === "platform_admin" || role === "customer_admin";
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

export function roleDisplayLabel(role: AccountRole | null): string {
  switch (role) {
    case "platform_admin":
      return "Quản trị nền tảng (SMG)";
    case "customer_admin":
      return "Admin khách hàng (Label)";
    case "artist":
      return "Nghệ sĩ / thành viên";
    default:
      return "Chưa đăng nhập";
  }
}
