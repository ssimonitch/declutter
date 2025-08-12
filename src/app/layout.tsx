import { Noto_Sans_JP } from "next/font/google";
import type { Metadata, Viewport } from "next";
import ClientShell from "@/components/client-shell";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "整理アプリ - かんたん片付けサポート",
  description:
    "写真を撮るだけで商品を整理。メルカリ風のシンプルなUIで、ご高齢の方でも簡単に使えます。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#ef4444",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-gray-50 min-h-screen safe-area-inset`}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
