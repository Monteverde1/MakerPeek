import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const title = "MakerPeek — Shopify app detector";
const description =
  "Shopify spy Chrome extension. Detect any store's apps, catalog metrics, bestsellers, and pricing from public data — every number links back to the source.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://makerpeek.com"),
  alternates: {
    canonical: "https://makerpeek.com",
  },
  openGraph: {
    title,
    description,
    url: "https://makerpeek.com",
    type: "website",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/gdnlmpkemmeemdecdcpbnmjjfipdgmfm";

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MakerPeek",
  description:
    "Shopify spy Chrome extension that detects any store's apps, catalog metrics, bestsellers, and pricing from public data.",
  applicationCategory: "BrowserApplication",
  operatingSystem: "Chrome",
  installUrl: CHROME_STORE_URL,
  downloadUrl: CHROME_STORE_URL,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Pro monthly",
      price: "11.00",
      priceCurrency: "USD",
      billingDuration: "P1M",
    },
    {
      "@type": "Offer",
      name: "Pro annual",
      price: "81.00",
      priceCurrency: "USD",
      billingDuration: "P1Y",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
