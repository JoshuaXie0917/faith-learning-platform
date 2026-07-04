import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "四月花",
  description: "学习与分享平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="bg-stone-50 text-stone-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}