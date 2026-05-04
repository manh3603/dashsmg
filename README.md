This is a Next.js app with an Express backend (in `backend/`).

## Getting Started

Cài dependency và chạy **cả API lẫn Next** (một lệnh):

```bash
npm install
npm run dev:all
```

Mở [http://localhost:3000](http://localhost:3000). API backend: `http://127.0.0.1:3001`; trình duyệt gọi API qua proxy `/smg-api/*`.

**Kiểm nhanh toàn dự án (lint + build frontend + build backend):** `npm run verify`

**Trong Cursor:** mở terminal (`` Ctrl+` `` hoặc **Terminal → New Terminal**), `cd` vào thư mục repo, chạy cùng lệnh như trên — không cần cấu hình riêng; đảm bảo **Node ≥ 20** (`node -v`).

### Gỡ lỗi khi «chạy dự án bị lỗi»

| Triệu chứng | Cách xử lý |
|---------------|------------|
| Đăng nhập lỗi / `smg-api` 502 / «Không kết nối được backend» | Bạn đang chỉ chạy `npm run dev` (thiếu API). Dùng **`npm run dev:all`**, hoặc terminal 1: `npm run dev --prefix backend`, terminal 2: `npm run dev`. |
| `EADDRINUSE` cổng 3000 hoặc 3001 | `npx kill-port 3000 3001` (hoặc tắt process Node cũ), rồi chạy lại `dev:all`. |
| `Cannot find module .../backend/dist/index.js` khi `npm run start` / Render | Chạy **`npm run build --prefix backend`** (đã gồm trong `build:all`). |
| `dev:all` chờ backend lâu | Đặt `DEV_BACKEND_WAIT_MS=180000` (ms) rồi chạy lại. |
| Windows / spawn lạ | `dev:all` dùng `scripts/dev-all.mjs` (gọi trực tiếp `node` + Next/tsx). Cập nhật Node **≥ 20**; thử xóa `.next` và `npm install` lại. |
| Next báo lỗi cache | Xóa thư mục `.next`, chạy lại `npm run dev:all`. |

<a id="render-docs"></a>

## Render.com — hướng dẫn từ đầu đến cuối

Kiến trúc: **một Web Service** chạy `npm run start:render` → `scripts/start-all.mjs` bật **Express** nội bộ `127.0.0.1:3001`, rồi **Next.js** trên `PORT` (Render cấp). Trình duyệt chỉ gọi **một URL**; Next proxy `/smg-api/*` sang backend (`app/smg-api/[[...path]]/route.ts`).

**Phân quyền Label / Nghệ sĩ / Admin** trên Render **giống hệt** chạy local: vai trò lưu trong `backend/data/accounts.json` (bootstrap, đăng ký `/register`, hoặc admin tạo trong **Tài khoản hệ thống**). Render không tự tạo thêm user label/artist — chỉ có sau khi bạn **bootstrap** admin và/hoặc **đăng ký** / **tạo tài khoản**.

### A. Chuẩn bị

1. Code đã có trên GitHub (ví dụ branch `main`).
2. Tài khoản [Render](https://render.com); nên liên kết GitHub trong **Account Settings** để chọn repo dễ hơn.

### B. Tạo dịch vụ

1. [Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → chọn repo → Render đọc `render.yaml` ở thư mục gốc.  
   **Hoặc** **New** → **Web Service** → chọn repo, cấu hình:
   - **Root Directory**: để trống.
   - **Build Command**: `npm install && npm run build:all`
   - **Start Command**: `npm run start:render`
   - **Health Check Path**: `/smg-api/health`
2. **Create** / **Apply** và chờ deploy xong.

### C. Kiểm tra sau deploy

1. **Logs**: không kẹt mãi `Backend not ready`. Nếu kẹt → **Environment** → `START_BACKEND_WAIT_MS=180000` → **Manual Deploy**.
2. Trình duyệt: `https://<tên-service>.onrender.com/smg-api/health` → **200** và JSON `"ok": true`.
3. Mở `https://<tên-service>.onrender.com` (trang chủ / đăng nhập).

### D. Admin nền tảng lần đầu (bootstrap)

1. Render → **Environment** → thêm `AUTH_BOOTSTRAP_SECRET` (chuỗi bí mật, không đưa vào Git).
2. Gọi **một lần** (thay `<HOST>` và nội dung JSON):

```bash
curl -sS -X POST "https://<HOST>/smg-api/api/auth/bootstrap-first-admin" \
  -H "Content-Type: application/json" \
  -d "{\"bootstrapSecret\":\"<AUTH_BOOTSTRAP_SECRET>\",\"login\":\"admin@ban.com\",\"password\":\"MatKhauManh\",\"displayName\":\"Admin SMG\"}"
```

3. Đăng nhập `/login` → vai trò **Quản trị nền tảng** (`platform_admin`). Chi tiết thêm: `backend/env.example`.

### E. Tài khoản Label và Nghệ sĩ

| Cách | Kết quả vai trò |
|------|-----------------|
| `/register` chọn **Nhãn (label)** | `customer_admin` — admin label (QC + tài chính/phân tích, không CMS/tài khoản hệ thống/deal) |
| `/register` chọn **Nghệ sĩ** | `artist` — không QC admin, không menu Phân tích/Tài chính |
| Đăng nhập **platform_admin** → **Tài khoản hệ thống** | Tạo user bất kỳ vai trò `artist` / `customer_admin` / `platform_admin` |

**Đã dùng admin chưa, label/nghệ sĩ chưa?** — Sau bootstrap chỉ có **một admin nền tảng** cho đến khi bạn **Register** hoặc **tạo thêm** trong Tài khoản hệ thống. Không có user label/artist ẩn trên Render.

### F. (Tuỳ chọn) Đăng nhập demo qua env

Nếu đặt `DEMO_AUTH_ADMIN_PASSWORD`, `DEMO_AUTH_LABEL_PASSWORD`, `DEMO_AUTH_ARTIST_PASSWORD` và `AUTH_DEMO_HINTS=1`, có thể đăng nhập theo `backend/src/auth/demoLogin.ts`:

| Login | Vai trò | Mật khẩu (env) |
|-------|---------|-----------------|
| `admin` hoặc `admin@smg.local` | `platform_admin` | `DEMO_AUTH_ADMIN_PASSWORD` |
| `labeladmin` hoặc `label.admin@smg.local` | `customer_admin` | `DEMO_AUTH_LABEL_PASSWORD` |
| `artist` hoặc `artist@smg.local` | `artist` | `DEMO_AUTH_ARTIST_PASSWORD` |

**Lưu ý:** Backend **ưu tiên** tài khoản trong `accounts.json`. Nếu trùng login với user đã lưu, dùng mật khẩu trong file, không phải env. Production: thường tắt `AUTH_DEMO_HINTS`.

### Phân quyền (đối chiếu code)

| Khu vực | `platform_admin` | `customer_admin` (Label) | `artist` |
|---------|-------------------|---------------------------|----------|
| Trang chủ, Phát hành, Kho, Marketing, Smart link, Nghệ sĩ, Cài đặt | Có | Có | Có |
| **Phân tích**, **Tài chính** | Có | Có | **Không** (`RequireFinancialAccess`, menu ẩn) |
| **QC & duyệt** | Có | Có | **Không** (`RequireQcAccess`) |
| **Cửa hàng & CMS**, **Tài khoản hệ thống**, **Deal** | Có | **Không** | **Không** (`RequirePlatformAdmin`) |

File tham chiếu: `app/lib/permissions.ts`, `app/dashboard/layout.tsx`, các component `Require*`.

<a id="render-checklist"></a>

### G. Render.com — checklist chi tiết (Dashboard)

Làm lần lượt; bỏ qua bước đã xong nếu repo đã kết nối.

1. **Đăng nhập** [dashboard.render.com](https://dashboard.render.com) (GitHub/Google/email).
2. **Liên kết GitHub** (một lần): **Account** (góc avatar) hoặc khi tạo service → **Connect GitHub** → cấp quyền repo (chọn **Only select repositories** nếu muốn hạn chế).
3. **Tạo dịch vụ từ Blueprint**
   - **New** → **Blueprint**.
   - **Connect** repository chứa project (fork hoặc repo gốc).
   - Branch mặc định thường là `main` — chỉnh nếu bạn deploy nhánh khác.
   - Render đọc file **`render.yaml`** ở **thư mục gốc** repo.
   - Đặt **Blueprint Name** (tuỳ ý) → **Apply**.
4. **Theo dõi lần deploy đầu**
   - Vào service vừa tạo → tab **Events** / **Logs**.
   - **Build**: phải chạy `npm install` và `npm run build:all` (Next + `backend` → `dist/`).
   - **Deploy**: sau build, chạy `npm run start:render`; log có `[start] waiting for backend` rồi `[start] backend ready`, sau đó Next **Ready**.
   - Khi trạng thái **Live**, copy URL dạng `https://<tên-service>.onrender.com`.
5. **Kiểm tra health (bắt buộc)**  
   Mở trình duyệt: `https://<tên-service>.onrender.com/smg-api/health`  
   - **HTTP 200** và JSON có `"ok": true` → proxy Next → backend ổn.  
   - **502 / timeout**: xem **Logs** — thường backend chưa kịp listen; vào **Environment** thêm `START_BACKEND_WAIT_MS=180000` → **Manual Deploy** → **Deploy latest commit**.
6. **Bootstrap admin nền tảng (một lần)**  
   - **Environment** → **Add Environment Variable**: `AUTH_BOOTSTRAP_SECRET` = chuỗi dài ngẫu nhiên → **Save Changes** (service sẽ redeploy hoặc bạn **Manual Deploy**).  
   - Từ máy bạn, gọi `POST` bootstrap (xem mục **D** ở trên, thay `<HOST>` bằng URL không có slash cuối).  
   - Đăng nhập `/login` bằng `login`/`password` đã gửi trong JSON.
7. **Tuỳ chọn sau khi ổn định**
   - **Persistent Disk**: gắn disk vào đường dẫn mount chứa `backend/data` nếu cần giữ user/upload lâu dài (free tier instance có thể xoá disk khi thay đổi plan/rebuild không có disk).
   - **Custom domain**: **Settings** → **Custom Domain** — trỏ DNS theo hướng dẫn Render; khi đó có thể cần đặt lại `CORS_ORIGIN` / `PUBLIC_BACKEND_URL` nếu domain khác `*.onrender.com` (thường vẫn để `start-all.mjs` tự suy ra từ `RENDER_EXTERNAL_URL`).

### H. Cursor / máy local vs Render (đối chiếu)

| Mục | Cursor hoặc terminal local | Render.com (production) |
|-----|---------------------------|-------------------------|
| Cài dependency | `npm install` | Render chạy trong **Build** (`npm install`) |
| Chạy dev (API + Next) | `npm run dev:all` | Không dùng — chỉ **Start** production |
| Build production | `npm run build:all` | Cùng lệnh trong **Build Command** |
| Chạy giống cloud | `NODE_ENV=production` + `PORT=...` + `npm run start:render` | **Start Command**: `npm run start:render` |
| URL | `http://localhost:3000` | `https://<service>.onrender.com` |
| API trình duyệt | `/smg-api/...` (proxy Next) | Giống vậy — **một host** |

### I. Lỗi thường gặp trên Render

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| Build failed — `Cannot find module` / `tsc` | Đảm bảo repo có `backend/` và **Build** là `npm install && npm run build:all`; Node **≥ 20** (`NODE_VERSION` trong `render.yaml`). |
| Logs: `Backend not ready after …ms` | Thêm `START_BACKEND_WAIT_MS=180000` (hoặc lớn hơn), **Manual Deploy**. |
| `/smg-api/health` 502 | Đọc **Logs** lúc request; backend crash → thường thiếu build backend (`dist`) hoặc lỗi runtime; build lại local với `npm run build:all`. |
| Trang web mở chậm lần đầu | **Free tier**: service **sleep** sau idle — lần mở đầu có thể **30–60s** cold start; bình thường. |
| Đăng nhập / upload lỗi sau restart | Free tier **không có persistent disk**: `accounts.json` có thể mất — gắn **Disk** hoặc backup DB ngoài. |

### Biến môi trường Render (tóm tắt)

- **`PUBLIC_BACKEND_URL` / `CORS_ORIGIN`**: thường **không cần đặt** — `start-all.mjs` gán từ `RENDER_EXTERNAL_URL`.
- **`NEXT_PUBLIC_BACKEND_URL`**: để trống nếu cùng một host (mặc định `/smg-api`).
- **`START_BACKEND_WAIT_MS`**: tuỳ chọn (mặc định chờ backend **120000** ms).
- **Phân tích production**: không bật `ANALYTICS_REPORT_MOCK`; dùng `ANALYTICS_PARTNER_REPORT_URL` theo `backend/env.example`.

### Dữ liệu & free tier

- `backend/data/` có thể **mất khi instance restart** — nên [Persistent Disk](https://render.com/docs/disks) hoặc DB/S3.

### Kiểm tra giống Render (local)

PowerShell:

```powershell
npm install
npm run build:all
$env:NODE_ENV="production"; $env:PORT="10000"; npm run start:render
```

Bash:

```bash
npm install && npm run build:all && NODE_ENV=production PORT=10000 npm run start:render
```

Mở `http://127.0.0.1:10000/smg-api/health` và `http://127.0.0.1:10000`.

Chi tiết API backend: `backend/env.example`.

## Tài liệu thêm

- **Deploy production**: dùng **Render** — xem [hướng dẫn đầy đủ](#render-docs), [checklist Dashboard](#render-checklist) và file [`render.yaml`](./render.yaml).
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs), [Deploying Next.js](https://nextjs.org/docs/app/building-your-application/deploying).
