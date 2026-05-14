import type { Metadata } from "next";
import {
  Tajawal,
  Rajdhani,
  JetBrains_Mono,
  Cairo,
  Outfit,
} from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// ─── Legacy fonts (kept for existing Amper-themed pages) ───
const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ─── ENDURTECH brand fonts (new) ───
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Endur Console — لوحة تحكم شركة اندر",
  description:
    "لوحة الإدارة الموحدة لمنتجات شركة اندر التقنية: أمبير · رستو · براق",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${rajdhani.variable} ${cairo.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#0D1B2A" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: "var(--font-tajawal)",
              direction: "rtl",
            },
          }}
        />
      </body>
    </html>
  );
}
