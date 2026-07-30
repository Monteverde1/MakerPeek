import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MakerPeek — Verifiable Shopify research for digital & POD sellers",
  description:
    "A Chrome extension for Shopify that surfaces verifiable product data, pricing patterns, app stack detection, and Pro watchlist change alerts — built for digital and POD sellers.",
  metadataBase: new URL("https://makerpeek.com"),
  openGraph: {
    title: "MakerPeek — Verifiable Shopify research for digital & POD sellers",
    description:
      "Verifiable Shopify research. Every number sourced. App stack detection, pricing analysis, and Pro watchlist change alerts for digital and POD sellers.",
    url: "https://makerpeek.com",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-cream text-ink">{children}</body>
    </html>
  );
}
