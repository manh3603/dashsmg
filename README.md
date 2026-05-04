This is a Next.js app with an Express backend (in `backend/`).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The frontend proxies API calls via `/smg-api/*` to the backend on port 3001.

## Render.com (một Web Service — Next + API)

Ứng dụng chạy **một process** duy nhất: `npm run start:render` → `scripts/start-all.mjs` khởi động **Express backend** nội bộ `127.0.0.1:3001`, sau đó **Next.js** lắng nghe `PORT` (Render gán). Trình duyệt chỉ gọi **cùng host**; route Next `/smg-api/*` proxy sang backend (xem `app/smg-api/[[...path]]/route.ts`).

| Bước | Việc cần làm |
|------|----------------|
| 1 | Đẩy code lên GitHub (repo private/public đều được). |
| 2 | Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → chọn repo → Render đọc `render.yaml` **hoặc** **Web Service** thủ công: **Root directory** trống, **Build** `npm install && npm run build:all`, **Start** `npm run start:render`. |
| 3 | Chờ build xong. **Health check** của Render gọi `GET /smg-api/health` (phải trả `200` + JSON `ok: true`). Nếu deploy **Failed** với log `Backend not ready` → trong **Environment** thêm `START_BACKEND_WAIT_MS=180000` rồi **Manual Deploy** lại (cold start free tier đôi khi chậm). |
| 4 | Mở URL dịch vụ (ví dụ `https://music-dashboard-xxxx.onrender.com`). Mở tab ẩn danh `https://.../smg-api/health` — nếu lỗi 502, xem log: backend có crash không (thiếu `dist`, thiếu env). |
| 5 | **Tài khoản admin đầu tiên**: trên Render → **Environment** → thêm `AUTH_BOOTSTRAP_SECRET` (chuỗi ngẫu nhiên dài). Gọi **một lần** (curl hoặc Postman): `POST https://<host>/smg-api/api/auth/bootstrap-first-admin` với header `Content-Type: application/json` và body JSON gồm `bootstrapSecret` (trùng env), `login`, `password`, `displayName`. Ví dụ: `{"bootstrapSecret":"YOUR_SECRET","login":"admin@label.com","password":"...","displayName":"Admin"}`. Chi tiết: `backend/env.example`. |
| 6 | Đăng nhập dashboard. User thường: **Register** trên `/register` hoặc admin tạo tại **Tài khoản hệ thống**. |

### Biến môi trường Render (quan trọng)

- **`PUBLIC_BACKEND_URL` / `CORS_ORIGIN`**: thường **không cần đặt**. `start-all.mjs` tự gán `PUBLIC_BACKEND_URL = RENDER_EXTERNAL_URL + "/smg-api"` và `CORS_ORIGIN = RENDER_EXTERNAL_URL` để link upload và CORS đúng với một domain.
- **`NEXT_PUBLIC_BACKEND_URL`**: mặc định để trống — trình duyệt dùng đường dẫn tương đối `/smg-api` (đúng với một Web Service). Chỉ set khi frontend và API là **hai domain khác nhau**.
- **`START_BACKEND_WAIT_MS`**: tuỳ chọn (mặc định script dùng **120000** ms chờ backend trước khi bật Next).
- **`DEMO_AUTH_*_PASSWORD`**: blueprint có thể đã tạo random — dùng đăng nhập dự phòng; gợi ý trên UI chỉ khi `AUTH_DEMO_HINTS=1`.
- **Phân tích production**: tắt mock — **không** đặt `ANALYTICS_REPORT_MOCK` trên Render; cấu hình `ANALYTICS_PARTNER_REPORT_URL` (và Bearer nếu cần) theo `backend/env.example`.

### Dữ liệu & free tier

- Dữ liệu ghi file: `backend/data/` (`accounts.json`, `partner-deals.json`, upload…). **Free tier**: disk theo instance có thể **mất khi redeploy/scale** — production nên gắn [Persistent Disk](https://render.com/docs/disks) mount vào `backend/data` hoặc chuyển sang database/S3.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
