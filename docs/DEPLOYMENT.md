# Triển khai lên mạng (tương tự soulmusic.asia)

Trang công khai [Soul Music Group — soulmusic.asia](https://soulmusic.asia/) thường gồm: **marketing site** (landing) + **ứng dụng** (dashboard / CRM) có thể ở **subdomain** hoặc path khác.

## Kiến trúc gợi ý

| Thành phần | Vai trò | Gợi ý dịch vụ |
|------------|---------|----------------|
| Marketing | Giới thiệu, pricing, contact | Webflow, Framer, Next.js tĩnh trên Vercel, hoặc WordPress |
| Dashboard (repo này) | Phát hành, QC, kho nhạc | [Vercel](https://vercel.com) / [Netlify](https://netlify.com) / [Cloudflare Pages](https://pages.cloudflare.com) |
| API backend | Upload, DDEX, ACRCloud | [Render](https://render.com), [Fly.io](https://fly.io), VPS |
| DNS + SSL | Tên miền `soulmusic.asia` | [Cloudflare DNS](https://www.cloudflare.com) (miễn phí) trỏ A/CNAME |

Ví dụ tên:

- `soulmusic.asia` → site marketing  
- `app.soulmusic.asia` hoặc `dashboard.soulmusic.asia` → Next.js (music-dashboard)  
- `api.soulmusic.asia` → Express backend  

## Biến môi trường (tối thiểu)

**Frontend (Vercel / tương đương)**

- `BACKEND_PROXY_TARGET` = `https://api.soulmusic.asia` (URL API **không** có `/` cuối)

**Backend**

- `PORT` (Render/Fly tự gán; local: `3001`)
- `CORS_ORIGIN` = `https://app.soulmusic.asia,https://soulmusic.asia`
- `PUBLIC_BACKEND_URL` = `https://api.soulmusic.asia` (URL công khai cho link file upload / master)
- Biến DDEX / CIS / SFTP theo `backend/env.example` và deal đối tác

## Lưu ý thương mại

- Free tier: máy API có thể **ngủ**, ổ đĩa **không bền** — cần DB + volume hoặc object storage cho production.  
- Demo hiện tại dùng **localStorage** + file JSON trên server — trước khi bán dịch vụ cần auth + database thật.

## Tài liệu DDEX nội bộ

Chuẩn giao tiếp cửa hàng / SFTP: xem checklist trong app **Cửa hàng & CMS** và file hướng dẫn `DDEX_Integration_Guide_EN.docx` (đồng bộ với [DDEX Knowledge Base](https://kb.ddex.net/)).
