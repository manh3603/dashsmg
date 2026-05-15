export type PageMessageKey =
  | "release.title"
  | "release.subtitle"
  | "release.step.releaseType"
  | "release.step.generalInfo"
  | "release.step.upload"
  | "release.step.metadata"
  | "release.step.storesTerritories"
  | "release.step.schedule"
  | "release.step.reviewSubmit"
  | "release.chooseType.title"
  | "release.single.hint"
  | "release.albumEp.hint"
  | "release.btn.back"
  | "release.btn.next"
  | "release.btn.submit"
  | "release.btn.processing"
  | "release.btn.submitting"
  | "release.submitModal.checkTitle"
  | "release.submitModal.sentTitle"
  | "release.submitModal.stay"
  | "release.submitModal.goCatalog"
  | "catalog.title"
  | "catalog.subtitle"
  | "catalog.filter.all"
  | "catalog.filter.pendingQc"
  | "catalog.filter.sentToStores"
  | "catalog.filter.live"
  | "catalog.filter.rejected"
  | "catalog.filter.draft"
  | "catalog.search.placeholder"
  | "catalog.table.product"
  | "catalog.table.status"
  | "catalog.empty"
  | "catalog.common.cancel"
  | "analytics.subtitle"
  | "analytics.loading"
  | "analytics.totalStreams"
  | "analytics.chart.title"
  | "finance.subtitle"
  | "finance.balance.label"
  | "finance.withdraw"
  | "finance.history.title"
  | "finance.history.empty"
  | "finance.modal.ok"
  | "artists.title"
  | "artists.subtitle"
  | "marketing.title"
  | "marketing.subtitle"
  | "marketing.smartlink.create"
  | "qcPage.title"
  | "qcPage.subtitle"
  | "qcPage.queue.title"
  | "qcPage.approvePush"
  | "qcPage.reject"
  | "qcPage.requestEdit"
  | "storesPage.subtitle"
  | "storesPage.list.title"
  | "settings.subtitle"
  | "settings.profile.title"
  | "login.title"
  | "login.username"
  | "login.password"
  | "login.submit"
  | "login.noAccount"
  | "login.register"
  | "register.title"
  | "register.submit"
  | "landing.hero.title"
  | "landing.cta.start"
  | "landing.nav.login"
  | "landing.nav.register"
  | "gate.platformAdmin.title"
  | "gate.platformAdmin.body"
  | "gate.backDashboard"
  | "gate.qc.title"
  | "gate.qc.body"
  | "gate.finance.title"
  | "gate.finance.body"
  | "status.live"
  | "status.pending"
  | "status.pending_qc"
  | "status.rejected"
  | "status.sent_to_stores"
  | "status.draft"
  | "status.takedown"
  | "deals.title"
  | "deals.subtitle"
  | "deals.sftp.host"
  | "deals.sftp.hostFallback"
  | "deals.sftp.login"
  | "deals.sftp.password"
  | "deals.sftp.store"
  | "deals.sftp.apply"
  | "deals.sftp.seedHint"
  | "deals.save"
  | "deals.addDeal"
  | "deals.newDeal"
  | "deals.empty"
  | "deals.notes"
  | "deals.statusLabel"
  | "deals.table.partner"
  | "deals.sftp.oneStoreHint"
  | "deals.sftp.passwordKeep"
  | "deals.err.noApi"
  | "deals.err.noSession"
  | "deals.err.needPassword"
  | "deals.confirmDelete"
  | "deals.status.draft"
  | "deals.status.active"
  | "deals.status.archived"
  | "distribute.advancedTools"
  | "bulk.optional.title"
  | "auth.redirecting"
  | "common.save"
  | "common.delete"
  | "common.edit"
  | "common.reload"
  | "common.close"
  | "common.confirm"
  | "common.saving";

const vi: Record<PageMessageKey, string> = {
  "release.title": "Phát hành nhạc",
  "release.subtitle": "Tạo bản phát hành mới và gửi lên các cửa hàng",
  "release.step.releaseType": "Loại phát hành",
  "release.step.generalInfo": "Thông tin chung",
  "release.step.upload": "Tải lên",
  "release.step.metadata": "Metadata",
  "release.step.storesTerritories": "Cửa hàng & lãnh thổ",
  "release.step.schedule": "Lịch phát hành",
  "release.step.reviewSubmit": "Xem lại & gửi",
  "release.chooseType.title": "Chọn loại phát hành",
  "release.single.hint": "Một bài hát đơn lẻ",
  "release.albumEp.hint": "Album hoặc EP (nhiều bài)",
  "release.btn.back": "Quay lại",
  "release.btn.next": "Tiếp theo",
  "release.btn.submit": "Gửi phát hành",
  "release.btn.processing": "Đang xử lý…",
  "release.btn.submitting": "Đang gửi…",
  "release.submitModal.checkTitle": "Xác nhận trước khi gửi",
  "release.submitModal.sentTitle": "Đã gửi thành công",
  "release.submitModal.stay": "Ở lại trang này",
  "release.submitModal.goCatalog": "Mở kho nhạc",
  "catalog.title": "Kho nhạc",
  "catalog.subtitle": "Quản lý sản phẩm, trạng thái và lịch sử phát hành",
  "catalog.filter.all": "Tất cả",
  "catalog.filter.pendingQc": "Chờ QC",
  "catalog.filter.sentToStores": "Đã gửi cửa hàng",
  "catalog.filter.live": "Đang phát",
  "catalog.filter.rejected": "Từ chối",
  "catalog.filter.draft": "Bản nháp",
  "catalog.search.placeholder": "Tìm theo tên, nghệ sĩ, UPC…",
  "catalog.table.product": "Sản phẩm",
  "catalog.table.status": "Trạng thái",
  "catalog.empty": "Chưa có sản phẩm nào phù hợp bộ lọc.",
  "catalog.common.cancel": "Hủy",
  "analytics.subtitle": "Theo dõi lượt nghe và xu hướng theo thời gian",
  "analytics.loading": "Đang tải dữ liệu phân tích…",
  "analytics.totalStreams": "Tổng lượt nghe",
  "analytics.chart.title": "Lượt nghe theo thời gian",
  "finance.subtitle": "Số dư, rút tiền và lịch sử giao dịch",
  "finance.balance.label": "Số dư khả dụng",
  "finance.withdraw": "Rút tiền",
  "finance.history.title": "Lịch sử giao dịch",
  "finance.history.empty": "Chưa có giao dịch nào.",
  "finance.modal.ok": "Đã hiểu",
  "artists.title": "Nghệ sĩ",
  "artists.subtitle": "Quản lý hồ sơ nghệ sĩ và liên kết phát hành",
  "marketing.title": "Marketing",
  "marketing.subtitle": "Smartlink, chiến dịch và công cụ quảng bá",
  "marketing.smartlink.create": "Tạo smartlink",
  "qcPage.title": "Kiểm soát chất lượng",
  "qcPage.subtitle": "Duyệt bản phát hành trước khi đẩy lên cửa hàng",
  "qcPage.queue.title": "Hàng đợi QC",
  "qcPage.approvePush": "Duyệt & đẩy cửa hàng",
  "qcPage.reject": "Từ chối",
  "qcPage.requestEdit": "Yêu cầu chỉnh sửa",
  "storesPage.subtitle": "Cửa hàng đã kết nối và trạng thái đồng bộ",
  "storesPage.list.title": "Danh sách cửa hàng",
  "settings.subtitle": "Tài khoản, hồ sơ và tùy chọn hệ thống",
  "settings.profile.title": "Hồ sơ",
  "login.title": "Đăng nhập",
  "login.username": "Tên đăng nhập",
  "login.password": "Mật khẩu",
  "login.submit": "Đăng nhập",
  "login.noAccount": "Chưa có tài khoản?",
  "login.register": "Đăng ký",
  "register.title": "Tạo tài khoản",
  "register.submit": "Đăng ký",
  "landing.hero.title": "Nền tảng phân phối nhạc số chuyên nghiệp",
  "landing.cta.start": "Bắt đầu ngay",
  "landing.nav.login": "Đăng nhập",
  "landing.nav.register": "Đăng ký",
  "gate.platformAdmin.title": "Quản trị nền tảng",
  "gate.platformAdmin.body":
    "Chỉ tài khoản quản trị nền tảng OMG mới truy cập cấu hình CMS và quản lý tài khoản hệ thống. Đăng nhập đúng vai trò hoặc liên hệ đội vận hành.",
  "gate.backDashboard": "Về bảng điều khiển",
  "gate.qc.title": "Khu vực QC",
  "gate.qc.body":
    "Chỉ quản trị nền tảng OMG mới duyệt hàng chờ phát hành. Đăng nhập bằng tài khoản quản trị nền tảng.",
  "gate.finance.title": "Khu vực tài chính",
  "gate.finance.body":
    "Báo cáo tài chính và phân tích doanh thu chỉ dành cho quản trị nền tảng hoặc admin khách hàng. Đăng nhập bằng tài khoản có quyền tương ứng.",
  "status.live": "Đang phát",
  "status.pending": "Chờ duyệt",
  "status.pending_qc": "Chờ QC",
  "status.rejected": "Từ chối",
  "status.sent_to_stores": "Đã gửi cửa hàng",
  "status.draft": "Bản nháp",
  "status.takedown": "Gỡ xuống",
  "deals.title": "Thỏa thuận & SFTP",
  "deals.subtitle": "Cấu hình kết nối SFTP và trạng thái thỏa thuận",
  "deals.sftp.host": "Máy chủ SFTP",
  "deals.sftp.hostFallback": "Dự phòng (tùy chọn)",
  "deals.sftp.login": "Tên đăng nhập",
  "deals.sftp.password": "Mật khẩu",
  "deals.sftp.store": "Cửa hàng",
  "deals.sftp.apply": "Áp dụng",
  "deals.sftp.seedHint":
    "4 deal CIS (VK, Yandex, ZVUK, Kion) tự tạo khi backend khởi động nếu đặt PARTNER_SFTP_SEED_PASSWORD trong backend/.env.",
  "deals.save": "Lưu deal",
  "deals.addDeal": "Thêm deal cửa hàng",
  "deals.newDeal": "Deal mới",
  "deals.empty": "Chưa có deal — thêm hoặc cấu hình seed env.",
  "deals.notes": "Ghi chú",
  "deals.statusLabel": "Trạng thái",
  "deals.table.partner": "Đối tác",
  "deals.sftp.oneStoreHint": "Mỗi deal gắn đúng một cửa hàng CIS — tránh nhầm SFTP giữa các CH.",
  "deals.sftp.passwordKeep": "Để trống nếu giữ mật khẩu cũ",
  "deals.err.noApi": "Chưa cấu hình API.",
  "deals.err.noSession": "Thiếu phiên API — đăng xuất và đăng nhập lại.",
  "deals.err.needPassword": "Nhập mật khẩu SFTP.",
  "deals.confirmDelete": "Xóa deal này?",
  "deals.status.draft": "Nháp",
  "deals.status.active": "Đang hoạt động",
  "deals.status.archived": "Lưu trữ",
  "distribute.advancedTools": "Công cụ nâng cao",
  "bulk.optional.title": "Tùy chọn hàng loạt",
  "auth.redirecting": "Đang chuyển hướng…",
  "common.save": "Lưu",
  "common.delete": "Xóa",
  "common.edit": "Sửa",
  "common.reload": "Tải lại",
  "common.close": "Đóng",
  "common.confirm": "Xác nhận",
  "common.saving": "Đang lưu…",
};

const en: Record<PageMessageKey, string> = {
  "release.title": "New release",
  "release.subtitle": "Create a release and deliver it to stores",
  "release.step.releaseType": "Release type",
  "release.step.generalInfo": "General info",
  "release.step.upload": "Upload",
  "release.step.metadata": "Metadata",
  "release.step.storesTerritories": "Stores & territories",
  "release.step.schedule": "Schedule",
  "release.step.reviewSubmit": "Review & submit",
  "release.chooseType.title": "Choose release type",
  "release.single.hint": "A single track",
  "release.albumEp.hint": "Album or EP (multiple tracks)",
  "release.btn.back": "Back",
  "release.btn.next": "Next",
  "release.btn.submit": "Submit release",
  "release.btn.processing": "Processing…",
  "release.btn.submitting": "Submitting…",
  "release.submitModal.checkTitle": "Confirm before submitting",
  "release.submitModal.sentTitle": "Submitted successfully",
  "release.submitModal.stay": "Stay on this page",
  "release.submitModal.goCatalog": "Open catalog",
  "catalog.title": "Catalog",
  "catalog.subtitle": "Manage products, status, and release history",
  "catalog.filter.all": "All",
  "catalog.filter.pendingQc": "Pending QC",
  "catalog.filter.sentToStores": "Sent to stores",
  "catalog.filter.live": "Live",
  "catalog.filter.rejected": "Rejected",
  "catalog.filter.draft": "Draft",
  "catalog.search.placeholder": "Search by title, artist, UPC…",
  "catalog.table.product": "Product",
  "catalog.table.status": "Status",
  "catalog.empty": "No products match the current filters.",
  "catalog.common.cancel": "Cancel",
  "analytics.subtitle": "Track streams and trends over time",
  "analytics.loading": "Loading analytics…",
  "analytics.totalStreams": "Total streams",
  "analytics.chart.title": "Streams over time",
  "finance.subtitle": "Balance, withdrawals, and transaction history",
  "finance.balance.label": "Available balance",
  "finance.withdraw": "Withdraw",
  "finance.history.title": "Transaction history",
  "finance.history.empty": "No transactions yet.",
  "finance.modal.ok": "OK",
  "artists.title": "Artists",
  "artists.subtitle": "Manage artist profiles and release links",
  "marketing.title": "Marketing",
  "marketing.subtitle": "Smartlinks, campaigns, and promotion tools",
  "marketing.smartlink.create": "Create smartlink",
  "qcPage.title": "Quality control",
  "qcPage.subtitle": "Review releases before they are pushed to stores",
  "qcPage.queue.title": "QC queue",
  "qcPage.approvePush": "Approve & push to stores",
  "qcPage.reject": "Reject",
  "qcPage.requestEdit": "Request edits",
  "storesPage.subtitle": "Connected stores and sync status",
  "storesPage.list.title": "Store list",
  "settings.subtitle": "Account, profile, and system preferences",
  "settings.profile.title": "Profile",
  "login.title": "Sign in",
  "login.username": "Username",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.noAccount": "Don't have an account?",
  "login.register": "Register",
  "register.title": "Create account",
  "register.submit": "Register",
  "landing.hero.title": "Professional digital music distribution",
  "landing.cta.start": "Get started",
  "landing.nav.login": "Sign in",
  "landing.nav.register": "Register",
  "gate.platformAdmin.title": "Platform administration",
  "gate.platformAdmin.body":
    "Only OMG platform admin accounts can access CMS configuration and system account management. Sign in with the correct role or contact operations.",
  "gate.backDashboard": "Back to dashboard",
  "gate.qc.title": "QC area",
  "gate.qc.body":
    "Only OMG platform admins can review the release queue. Sign in with a platform admin account.",
  "gate.finance.title": "Finance area",
  "gate.finance.body":
    "Financial reports and revenue analytics are for platform admins or customer admins only. Sign in with an authorized account.",
  "status.live": "Live",
  "status.pending": "Pending",
  "status.pending_qc": "Pending QC",
  "status.rejected": "Rejected",
  "status.sent_to_stores": "Sent to stores",
  "status.draft": "Draft",
  "status.takedown": "Takedown",
  "deals.title": "Deals & SFTP",
  "deals.subtitle": "Configure SFTP connections and deal status",
  "deals.sftp.host": "SFTP host",
  "deals.sftp.hostFallback": "Fallback (optional)",
  "deals.sftp.login": "Login",
  "deals.sftp.password": "Password",
  "deals.sftp.store": "Store",
  "deals.sftp.apply": "Apply",
  "deals.sftp.seedHint":
    "Four CIS deals (VK, Yandex, ZVUK, Kion) are auto-created on backend start when PARTNER_SFTP_SEED_PASSWORD is set in backend/.env.",
  "deals.save": "Save deal",
  "deals.addDeal": "Add store deal",
  "deals.newDeal": "New deal",
  "deals.empty": "No deals yet — add one or configure seed env.",
  "deals.notes": "Notes",
  "deals.statusLabel": "Status",
  "deals.table.partner": "Partner",
  "deals.sftp.oneStoreHint": "One CIS store per deal — keeps SFTP credentials separate per store.",
  "deals.sftp.passwordKeep": "Leave blank to keep current password",
  "deals.err.noApi": "API not configured.",
  "deals.err.noSession": "Missing API session — sign out and sign in again.",
  "deals.err.needPassword": "Enter SFTP password.",
  "deals.confirmDelete": "Delete this deal?",
  "deals.status.draft": "Draft",
  "deals.status.active": "Active",
  "deals.status.archived": "Archived",
  "distribute.advancedTools": "Advanced tools",
  "bulk.optional.title": "Bulk options",
  "auth.redirecting": "Redirecting…",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.reload": "Reload",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.saving": "Saving…",
};

const zh: Record<PageMessageKey, string> = {
  "release.title": "新建发行",
  "release.subtitle": "创建发行并投递至各商店",
  "release.step.releaseType": "发行类型",
  "release.step.generalInfo": "基本信息",
  "release.step.upload": "上传",
  "release.step.metadata": "元数据",
  "release.step.storesTerritories": "商店与地区",
  "release.step.schedule": "发行日程",
  "release.step.reviewSubmit": "审核并提交",
  "release.chooseType.title": "选择发行类型",
  "release.single.hint": "单曲",
  "release.albumEp.hint": "专辑或 EP（多首曲目）",
  "release.btn.back": "上一步",
  "release.btn.next": "下一步",
  "release.btn.submit": "提交发行",
  "release.btn.processing": "处理中…",
  "release.btn.submitting": "提交中…",
  "release.submitModal.checkTitle": "提交前请确认",
  "release.submitModal.sentTitle": "提交成功",
  "release.submitModal.stay": "留在此页",
  "release.submitModal.goCatalog": "打开曲库",
  "catalog.title": "曲库",
  "catalog.subtitle": "管理产品、状态与发行记录",
  "catalog.filter.all": "全部",
  "catalog.filter.pendingQc": "待质检",
  "catalog.filter.sentToStores": "已投递商店",
  "catalog.filter.live": "已上线",
  "catalog.filter.rejected": "已拒绝",
  "catalog.filter.draft": "草稿",
  "catalog.search.placeholder": "按标题、艺人、UPC 搜索…",
  "catalog.table.product": "产品",
  "catalog.table.status": "状态",
  "catalog.empty": "没有符合当前筛选条件的产品。",
  "catalog.common.cancel": "取消",
  "analytics.subtitle": "跟踪播放量与时间趋势",
  "analytics.loading": "正在加载分析数据…",
  "analytics.totalStreams": "总播放量",
  "analytics.chart.title": "播放量趋势",
  "finance.subtitle": "余额、提现与交易记录",
  "finance.balance.label": "可用余额",
  "finance.withdraw": "提现",
  "finance.history.title": "交易记录",
  "finance.history.empty": "暂无交易记录。",
  "finance.modal.ok": "确定",
  "artists.title": "艺人",
  "artists.subtitle": "管理艺人资料与发行关联",
  "marketing.title": "营销",
  "marketing.subtitle": "Smartlink、活动与推广工具",
  "marketing.smartlink.create": "创建 Smartlink",
  "qcPage.title": "质量控制",
  "qcPage.subtitle": "在推送至商店前审核发行",
  "qcPage.queue.title": "质检队列",
  "qcPage.approvePush": "批准并推送商店",
  "qcPage.reject": "拒绝",
  "qcPage.requestEdit": "要求修改",
  "storesPage.subtitle": "已连接商店与同步状态",
  "storesPage.list.title": "商店列表",
  "settings.subtitle": "账户、资料与系统偏好",
  "settings.profile.title": "个人资料",
  "login.title": "登录",
  "login.username": "用户名",
  "login.password": "密码",
  "login.submit": "登录",
  "login.noAccount": "还没有账户？",
  "login.register": "注册",
  "register.title": "创建账户",
  "register.submit": "注册",
  "landing.hero.title": "专业数字音乐发行平台",
  "landing.cta.start": "立即开始",
  "landing.nav.login": "登录",
  "landing.nav.register": "注册",
  "gate.platformAdmin.title": "平台管理",
  "gate.platformAdmin.body":
    "仅 OMG 平台管理员可访问 CMS 配置与系统账户管理。请使用正确角色登录或联系运营团队。",
  "gate.backDashboard": "返回控制台",
  "gate.qc.title": "质检专区",
  "gate.qc.body": "仅 OMG 平台管理员可审核发行队列。请使用平台管理员账户登录。",
  "gate.finance.title": "财务专区",
  "gate.finance.body": "财务报表与收入分析仅供平台管理员或客户管理员使用。请使用具备相应权限的账户登录。",
  "status.live": "已上线",
  "status.pending": "待审核",
  "status.pending_qc": "待质检",
  "status.rejected": "已拒绝",
  "status.sent_to_stores": "已投递商店",
  "status.draft": "草稿",
  "status.takedown": "下架",
  "deals.title": "协议与 SFTP",
  "deals.subtitle": "配置 SFTP 连接与协议状态",
  "deals.sftp.host": "SFTP 主机",
  "deals.sftp.hostFallback": "备用主机（可选）",
  "deals.sftp.login": "登录名",
  "deals.sftp.password": "密码",
  "deals.sftp.store": "商店",
  "deals.sftp.apply": "应用",
  "deals.sftp.seedHint":
    "设置 backend/.env 中的 PARTNER_SFTP_SEED_PASSWORD 后，后端启动时将自动创建 4 个 CIS 商店协议（VK、Yandex、ZVUK、Kion）。",
  "deals.save": "保存协议",
  "deals.addDeal": "添加商店协议",
  "deals.newDeal": "新协议",
  "deals.empty": "暂无协议 — 请添加或配置 seed 环境变量。",
  "deals.notes": "备注",
  "deals.statusLabel": "状态",
  "deals.table.partner": "合作伙伴",
  "deals.sftp.oneStoreHint": "每个协议仅绑定一个 CIS 商店 — 避免各店 SFTP 混淆。",
  "deals.sftp.passwordKeep": "留空则保留原密码",
  "deals.err.noApi": "未配置 API。",
  "deals.err.noSession": "缺少 API 会话 — 请重新登录。",
  "deals.err.needPassword": "请输入 SFTP 密码。",
  "deals.confirmDelete": "删除此协议？",
  "deals.status.draft": "草稿",
  "deals.status.active": "生效中",
  "deals.status.archived": "已归档",
  "distribute.advancedTools": "高级工具",
  "bulk.optional.title": "批量选项",
  "auth.redirecting": "正在跳转…",
  "common.save": "保存",
  "common.delete": "删除",
  "common.edit": "编辑",
  "common.reload": "重新加载",
  "common.close": "关闭",
  "common.confirm": "确认",
  "common.saving": "保存中…",
};

export const pageMessages: Record<"vi" | "en" | "zh", Record<PageMessageKey, string>> = {
  vi,
  en,
  zh,
};
