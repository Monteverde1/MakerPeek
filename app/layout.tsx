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
  title: "MakerPeek — Seller research for digital & POD shops",
  description:
    "A Chrome extension for sellers on Shopify that surfaces real sales estimates, supplier detection, and theme analysis — built for POD-focused stores other tools get wrong.",
  metadataBase: new URL("https://makerpeek.com"),
  openGraph: {
    title: "MakerPeek — Seller research for digital & POD shops",
    description:
      "Real sales estimates and supplier intelligence for POD-focused Shopify shops.",
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
