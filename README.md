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

This repo is set up to run **frontend + backend in one Render Web Service**.

- **Build command**: `npm install && npm run build:all`
- **Start command**: `npm run start:render`
- **Health check path**: `/smg-api/health`

### Required environment variables (for demo login)

Set these in Render → *Environment* (values are your choice):

- `DEMO_AUTH_ADMIN_PASSWORD`
- `DEMO_AUTH_LABEL_PASSWORD`
- `DEMO_AUTH_ARTIST_PASSWORD`

An example file is provided at `.env.example`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
