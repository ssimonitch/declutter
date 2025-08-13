import { Noto_Sans_JP } from "next/font/google";
import type { Metadata, Viewport } from "next";
import ClientShell from "@/components/layout/ClientShell";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "すずメモ - かんたん片付けサポート",
  description:
    "写真を撮るだけで商品を整理。メルカリ風のシンプルなUIで、ご高齢の方でも簡単に使えます。すずメモがお手伝いします。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#77A3B2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-suzu-cream min-h-screen safe-area-inset`}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
