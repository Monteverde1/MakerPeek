import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AlternativePage from "@/components/AlternativePage";
import { getAlternative } from "@/lib/alternatives";

const SLUG = "koala-inspector-alternative";
const alt = getAlternative(SLUG);

export const metadata: Metadata = {
  title: alt?.title,
  description: alt?.description,
  alternates: { canonical: `https://makerpeek.com/${SLUG}` },
  openGraph: {
    title: alt?.title,
    description: alt?.description,
    url: `https://makerpeek.com/${SLUG}`,
    type: "article",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: alt?.title,
    description: alt?.description,
    images: ["/og-image.png"],
  },
};

export default function Page() {
  if (!alt) notFound();
  return <AlternativePage alt={alt} />;
}
