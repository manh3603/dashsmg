This is a Next.js app with an Express backend (in `backend/`).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The frontend proxies API calls via `/smg-api/*` to the backend on port 3001.

## Render.com (single service)

Chạy **Next + API Express** trong một Web Service (`scripts/start-all.mjs`).

- **Build**: `npm install && npm run build:all`
- **Start**: `npm run start:render`
- **Health check**: `/smg-api/health` (proxy tới backend `/health`)

`start-all.mjs` tự gán **`PUBLIC_BACKEND_URL`** = `RENDER_EXTERNAL_URL` + `/smg-api` (link upload/file công khai) và **`CORS_ORIGIN`** từ `RENDER_EXTERNAL_URL` khi bạn không đặt tay.

### Tài khoản & dữ liệu

- **Thương mại**: đăng ký `/register` hoặc quản trị tạo user tại **Tài khoản hệ thống** — lưu `backend/data/accounts.json` (bcrypt).
- **Admin đầu tiên**: đặt `AUTH_BOOTSTRAP_SECRET` trên Render, gọi một lần `POST /api/auth/bootstrap-first-admin` (xem `backend/env.example`).
- **Deal đối tác**: trang **Deal đối tác** — `backend/data/partner-deals.json`.
- **Free tier**: ổ đĩa instance có thể **mất khi restart** — bản production nên gắn **Persistent Disk** trỏ vào `backend/data` hoặc dùng DB ngoài.

### Biến môi trường (tuỳ chọn)

- `DEMO_AUTH_*_PASSWORD` — đăng nhập dự phòng qua env (gợi ý UI chỉ khi `AUTH_DEMO_HINTS=1`).
- `AUTH_BOOTSTRAP_SECRET` — tạo platform admin lần đầu.
- `PUBLIC_BACKEND_URL`, `CORS_ORIGIN` — ghi đè nếu domain tách khác `RENDER_EXTERNAL_URL`.

Chi tiết API: `backend/env.example`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
