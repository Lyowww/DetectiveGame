import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans, Noto_Sans_Armenian, Noto_Serif, Noto_Serif_Armenian } from "next/font/google";
import { PreferenceBoot } from "@/components/preference-boot";
import { TelegramBoot } from "@/components/telegram-boot";
import "./globals.css";

const sans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sansArmenian = Noto_Sans_Armenian({
  subsets: ["armenian"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-hy",
  display: "swap",
});

const serif = Noto_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const serifArmenian = Noto_Serif_Armenian({
  subsets: ["armenian"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-hy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CASEFILE",
  description: "You are the detective. Interview people, collect evidence, solve the case.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${sansArmenian.variable} ${serif.variable} ${serifArmenian.variable}`}>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <a className="skip" href="#main">Skip to content</a>
        <PreferenceBoot />
        <TelegramBoot />
        {children}
      </body>
    </html>
  );
}
