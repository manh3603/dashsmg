import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BRAND_FULL, BRAND_LOGO_PATH } from "@/lib/brand";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: "Nền tảng phân phối nhạc Orbital Music Group — nghệ sĩ, nhãn & vận hành",
  icons: {
    icon: [{ url: BRAND_LOGO_PATH, type: "image/png" }],
    shortcut: BRAND_LOGO_PATH,
    apple: BRAND_LOGO_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}