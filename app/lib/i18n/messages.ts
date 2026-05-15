import type { Locale } from "./types";
import { pageMessages, type PageMessageKey } from "./page-messages";

export type CoreMessageKey =
  | "nav.home"
  | "nav.distribute"
  | "nav.catalog"
  | "nav.analytics"
  | "nav.finance"
  | "nav.artists"
  | "nav.marketing"
  | "nav.stores"
  | "nav.accounts"
  | "nav.deals"
  | "nav.qc"
  | "nav.settings"
  | "nav.logout"
  | "nav.opsQc"
  | "sidebar.tagline"
  | "header.profile"
  | "role.platform_admin"
  | "role.customer_admin"
  | "role.artist"
  | "role.unknown"
  | "lang.select"
  | "common.loading"
  | "home.title"
  | "home.subtitle"
  | "home.streams.label"
  | "home.streams.clickHint"
  | "home.revenue.label"
  | "home.revenue.hint"
  | "home.tracks.label"
  | "home.tracks.fromCatalog"
  | "home.tracks.clickHint"
  | "home.modal.close"
  | "home.modal.streams"
  | "home.modal.revenue"
  | "home.modal.tracks"
  | "home.modal.tracksBody"
  | "home.modal.metricsBody"
  | "home.modal.openAnalytics"
  | "home.chart.title"
  | "home.chart.subtitle"
  | "home.chart.empty"
  | "home.notifications.title"
  | "home.notifications.qcLogHeader"
  | "home.notifications.emptyQc"
  | "home.notifications.empty"
  | "home.notifications.catalogHeader"
  | "home.notifications.open"
  | "home.notifications.catalogLink"
  | "notif.pending_qc.title"
  | "notif.pending_qc.body"
  | "notif.rejected.title"
  | "notif.rejected.body"
  | "notif.rejected.bodyWhy"
  | "notif.draft.title"
  | "notif.draft.body"
  | "notif.sent.title"
  | "notif.sent.body"
  | "notif.takedown.title"
  | "notif.takedown.body"
  | "notif.takedown.bodyNote"
  | "notif.live.title"
  | "notif.live.body"
  | "qc.approve_push"
  | "qc.reject"
  | "qc.request_edit"
  | "qc.mark_live"
  | "qc.recall"
  | "qc.default"
  | "player.pickFile"
  | "player.changeFile"
  | "player.hint";

export type MessageKey = CoreMessageKey | PageMessageKey;

const viCore: Record<CoreMessageKey, string> = {
  "nav.home": "Trang chủ",
  "nav.distribute": "Phát hành nhạc",
  "nav.catalog": "Kho nhạc",
  "nav.analytics": "Phân tích",
  "nav.finance": "Tài chính & Thu nhập",
  "nav.artists": "Nghệ sĩ",
  "nav.marketing": "Công cụ Marketing",
  "nav.stores": "Cửa hàng & CMS",
  "nav.accounts": "Tài khoản hệ thống",
  "nav.deals": "Deal đối tác",
  "nav.qc": "QC & duyệt",
  "nav.settings": "Cài đặt tài khoản",
  "nav.logout": "Đăng xuất",
  "nav.opsQc": "Vận hành & QC",
  "sidebar.tagline": "Orbital Music Group · Phát hành",
  "header.profile": "Hồ sơ",
  "role.platform_admin": "Quản trị nền tảng (OMG)",
  "role.customer_admin": "Admin nhãn (Label)",
  "role.artist": "Nghệ sĩ / thành viên",
  "role.unknown": "Chưa đăng nhập",
  "lang.select": "Ngôn ngữ",
  "common.loading": "Đang tải…",
  "home.title": "Trang chủ",
  "home.subtitle": "Tổng quan từ kho phát hành; stream và doanh thu cập nhật khi tích hợp báo cáo DSP.",
  "home.streams.label": "Tổng lượt nghe (streams)",
  "home.streams.clickHint": "Bấm xem ghi chú",
  "home.revenue.label": "Doanh thu (tháng)",
  "home.revenue.hint": "Đồng bộ từ đối tác / báo cáo",
  "home.tracks.label": "Bản đang live / đẩy CH",
  "home.tracks.fromCatalog": "Từ kho nhạc cục bộ",
  "home.tracks.clickHint": "Bấm xem ghi chú",
  "home.modal.close": "Đóng",
  "home.modal.streams": "Streams",
  "home.modal.revenue": "Doanh thu",
  "home.modal.tracks": "Bản nhạc hoạt động",
  "home.modal.tracksBody": "Hiện có {count} bản ở trạng thái live hoặc đang đẩy cửa hàng trong kho.",
  "home.modal.metricsBody":
    "Số liệu streams và doanh thu hiển thị tại đây sau khi nối API hoặc nhập báo cáo từ cửa hàng theo hợp đồng.",
  "home.modal.openAnalytics": "Mở trang phân tích",
  "home.chart.title": "Tăng trưởng luồng — 7 ngày qua",
  "home.chart.subtitle": "Dữ liệu từ DSP sau khi tích hợp",
  "home.chart.empty": "Chưa có dữ liệu stream — biểu đồ sẽ hiển thị khi cửa hàng trả về số liệu.",
  "home.notifications.title": "Thông báo",
  "home.notifications.qcLogHeader": "Nhật ký duyệt / từ chối (mới nhất ở trên)",
  "home.notifications.emptyQc":
    "Chưa có nhật ký QC. Khi bạn duyệt, từ chối hoặc yêu cầu sửa, mục sẽ xuất hiện ở đây theo thứ tự thời gian (mới → cũ). Nghệ sĩ xem thêm trạng thái kho bên dưới.",
  "home.notifications.empty":
    "Chưa có thông báo. Các cập nhật trạng thái phát hành (chờ QC, từ chối, đẩy CH…) sẽ hiện khi có dữ liệu trong kho nhạc.",
  "home.notifications.catalogHeader": "Trạng thái kho phát hành",
  "home.notifications.open": "Mở",
  "home.notifications.catalogLink": "Kho nhạc",
  "notif.pending_qc.title": "Chờ QC",
  "notif.pending_qc.body": "«{title}» đang chờ kiểm duyệt.",
  "notif.rejected.title": "Từ chối",
  "notif.rejected.body": "«{title}» bị từ chối — mở kho nhạc để sửa và gửi lại.",
  "notif.rejected.bodyWhy": "«{title}» bị từ chối: {why}",
  "notif.draft.title": "Cần chỉnh sửa",
  "notif.draft.body": "«{title}»: {why}",
  "notif.sent.title": "Đang đẩy cửa hàng",
  "notif.sent.body": "«{title}» đang trong luồng gửi metadata.",
  "notif.takedown.title": "Takedown",
  "notif.takedown.body": "«{title}» — đánh dấu takedown / gỡ cửa hàng.",
  "notif.takedown.bodyNote": "«{title}» — {note}",
  "notif.live.title": "Đã live",
  "notif.live.body": "«{title}» đánh dấu live trên hệ thống.",
  "qc.approve_push": "Đã duyệt — đẩy cửa hàng",
  "qc.reject": "Từ chối phát hành",
  "qc.request_edit": "Yêu cầu chỉnh sửa",
  "qc.mark_live": "Đánh dấu live",
  "qc.recall": "Thu hồi / lỗi",
  "qc.default": "QC",
  "player.pickFile": "Thử nghe file tải lên",
  "player.changeFile": "Đổi file",
  "player.hint": "Chọn file WAV/FLAC/MP3 để nghe thử trước khi gửi duyệt.",
};

const enCore: Record<CoreMessageKey, string> = {
  "nav.home": "Home",
  "nav.distribute": "Release music",
  "nav.catalog": "Catalog",
  "nav.analytics": "Analytics",
  "nav.finance": "Finance & earnings",
  "nav.artists": "Artists",
  "nav.marketing": "Marketing tools",
  "nav.stores": "Stores & CMS",
  "nav.accounts": "System accounts",
  "nav.deals": "Partner deals",
  "nav.qc": "QC & approval",
  "nav.settings": "Account settings",
  "nav.logout": "Log out",
  "nav.opsQc": "Operations & QC",
  "sidebar.tagline": "Orbital Music Group · Distribution",
  "header.profile": "Profile",
  "role.platform_admin": "Platform admin (OMG)",
  "role.customer_admin": "Label admin",
  "role.artist": "Artist / member",
  "role.unknown": "Not signed in",
  "lang.select": "Language",
  "common.loading": "Loading…",
  "home.title": "Home",
  "home.subtitle": "Overview from your release catalog; streams and revenue update when DSP reporting is connected.",
  "home.streams.label": "Total streams",
  "home.streams.clickHint": "Click for details",
  "home.revenue.label": "Revenue (month)",
  "home.revenue.hint": "Synced from partners / reports",
  "home.tracks.label": "Live / in delivery",
  "home.tracks.fromCatalog": "From local catalog",
  "home.tracks.clickHint": "Click for details",
  "home.modal.close": "Close",
  "home.modal.streams": "Streams",
  "home.modal.revenue": "Revenue",
  "home.modal.tracks": "Active releases",
  "home.modal.tracksBody": "{count} release(s) are live or being delivered to stores.",
  "home.modal.metricsBody":
    "Stream and revenue figures appear here after connecting store APIs or importing partner reports per contract.",
  "home.modal.openAnalytics": "Open analytics",
  "home.chart.title": "Stream growth — last 7 days",
  "home.chart.subtitle": "Data from DSPs after integration",
  "home.chart.empty": "No stream data yet — the chart will appear when stores return figures.",
  "home.notifications.title": "Notifications",
  "home.notifications.qcLogHeader": "Review log (newest first)",
  "home.notifications.emptyQc":
    "No QC log yet. Approvals, rejections, and edit requests will appear here in chronological order (new → old). Artists also see catalog status below.",
  "home.notifications.empty":
    "No notifications yet. Release status updates (pending QC, rejected, delivery…) appear when catalog data exists.",
  "home.notifications.catalogHeader": "Release catalog status",
  "home.notifications.open": "Open",
  "home.notifications.catalogLink": "Catalog",
  "notif.pending_qc.title": "Pending QC",
  "notif.pending_qc.body": "«{title}» is awaiting review.",
  "notif.rejected.title": "Rejected",
  "notif.rejected.body": "«{title}» was rejected — open the catalog to fix and resubmit.",
  "notif.rejected.bodyWhy": "«{title}» was rejected: {why}",
  "notif.draft.title": "Needs edits",
  "notif.draft.body": "«{title}»: {why}",
  "notif.sent.title": "Delivering to stores",
  "notif.sent.body": "«{title}» is in the metadata delivery pipeline.",
  "notif.takedown.title": "Takedown",
  "notif.takedown.body": "«{title}» — marked takedown / removed from stores.",
  "notif.takedown.bodyNote": "«{title}» — {note}",
  "notif.live.title": "Live",
  "notif.live.body": "«{title}» is marked live in the system.",
  "qc.approve_push": "Approved — pushing to stores",
  "qc.reject": "Release rejected",
  "qc.request_edit": "Edit requested",
  "qc.mark_live": "Marked live",
  "qc.recall": "Recalled / error",
  "qc.default": "QC",
  "player.pickFile": "Preview uploaded file",
  "player.changeFile": "Change file",
  "player.hint": "Pick a WAV/FLAC/MP3 file to preview before submitting for review.",
};

const zhCore: Record<CoreMessageKey, string> = {
  "nav.home": "首页",
  "nav.distribute": "音乐发行",
  "nav.catalog": "曲库",
  "nav.analytics": "分析",
  "nav.finance": "财务与收入",
  "nav.artists": "艺人",
  "nav.marketing": "营销工具",
  "nav.stores": "商店与 CMS",
  "nav.accounts": "系统账户",
  "nav.deals": "合作伙伴协议",
  "nav.qc": "质检与审批",
  "nav.settings": "账户设置",
  "nav.logout": "退出登录",
  "nav.opsQc": "运营与质检",
  "sidebar.tagline": "Orbital Music Group · 发行",
  "header.profile": "个人资料",
  "role.platform_admin": "平台管理 (OMG)",
  "role.customer_admin": "客户管理员 (Label)",
  "role.artist": "艺人 / 成员",
  "role.unknown": "未登录",
  "lang.select": "语言",
  "common.loading": "加载中…",
  "home.title": "首页",
  "home.subtitle": "发行曲库总览；接入 DSP 报表后更新播放与收入数据。",
  "home.streams.label": "总播放量",
  "home.streams.clickHint": "点击查看说明",
  "home.revenue.label": "收入（月）",
  "home.revenue.hint": "从合作伙伴 / 报表同步",
  "home.tracks.label": "已上线 / 投递中",
  "home.tracks.fromCatalog": "来自本地曲库",
  "home.tracks.clickHint": "点击查看说明",
  "home.modal.close": "关闭",
  "home.modal.streams": "播放量",
  "home.modal.revenue": "收入",
  "home.modal.tracks": "活跃发行",
  "home.modal.tracksBody": "曲库中有 {count} 个发行处于已上线或正在投递至商店。",
  "home.modal.metricsBody": "连接商店 API 或按合同导入合作伙伴报表后，此处将显示播放与收入数据。",
  "home.modal.openAnalytics": "打开分析页",
  "home.chart.title": "播放增长 — 近 7 天",
  "home.chart.subtitle": "接入 DSP 后的数据",
  "home.chart.empty": "暂无播放数据 — 商店返回数据后将显示图表。",
  "home.notifications.title": "通知",
  "home.notifications.qcLogHeader": "审批日志（最新在上）",
  "home.notifications.emptyQc":
    "暂无质检日志。审批、拒绝或修改请求将按时间顺序显示（新→旧）。艺人可在下方查看曲库状态。",
  "home.notifications.empty": "暂无通知。曲库有数据后将显示发行状态更新（待质检、拒绝、投递等）。",
  "home.notifications.catalogHeader": "发行曲库状态",
  "home.notifications.open": "打开",
  "home.notifications.catalogLink": "曲库",
  "notif.pending_qc.title": "待质检",
  "notif.pending_qc.body": "«{title}» 等待审核。",
  "notif.rejected.title": "已拒绝",
  "notif.rejected.body": "«{title}» 已被拒绝 — 请打开曲库修改后重新提交。",
  "notif.rejected.bodyWhy": "«{title}» 已被拒绝：{why}",
  "notif.draft.title": "需要修改",
  "notif.draft.body": "«{title}»：{why}",
  "notif.sent.title": "正在投递商店",
  "notif.sent.body": "«{title}» 正在 metadata 投递流程中。",
  "notif.takedown.title": "下架",
  "notif.takedown.body": "«{title}» — 已标记下架 / 从商店移除。",
  "notif.takedown.bodyNote": "«{title}» — {note}",
  "notif.live.title": "已上线",
  "notif.live.body": "«{title}» 已在系统中标记为上线。",
  "qc.approve_push": "已批准 — 正在推送商店",
  "qc.reject": "发行被拒绝",
  "qc.request_edit": "要求修改",
  "qc.mark_live": "标记上线",
  "qc.recall": "撤回 / 错误",
  "qc.default": "质检",
  "player.pickFile": "试听上传文件",
  "player.changeFile": "更换文件",
  "player.hint": "选择 WAV/FLAC/MP3 文件，提交审批前试听。",
};

const vi: Record<MessageKey, string> = { ...viCore, ...pageMessages.vi };
const en: Record<MessageKey, string> = { ...enCore, ...pageMessages.en };
const zh: Record<MessageKey, string> = { ...zhCore, ...pageMessages.zh };

export const messages: Record<Locale, Record<MessageKey, string>> = { vi, en, zh };

export type TranslateVars = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  let s = messages[locale][key] ?? messages.vi[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
