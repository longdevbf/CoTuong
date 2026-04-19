import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cờ Tướng Offline",
  description: "Vietnamese Chess (Xiangqi) game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
