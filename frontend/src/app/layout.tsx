import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Nurl: быстрая передача файлов",
  description:
    "Быстрая передача файлов между устройствами без регистрации. Загрузите файл, получите ссылку или QR-код и откройте его на любом другом устройстве.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f3f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={onest.variable}>
      <body>{children}</body>
    </html>
  );
}
