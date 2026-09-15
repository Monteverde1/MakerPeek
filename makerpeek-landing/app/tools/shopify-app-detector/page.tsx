import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { detectStore, normalizeStoreInput, type DetectResult } from "@/lib/detect";
import { checkRateLimit, getCached, setCached } from "@/lib/rate-limit";
import { CHROME_STORE_URL } from "@/lib/alternatives";

export const metadata: Metadata = {
  title: "Shopify App Detector — see what apps any store uses",
  description:
    "Paste a Shopify store URL and see which apps it runs and which theme it uses, read straight from the storefront's own public code. Free, no signup.",
  alternates: { canonical: "https://makerpeek.com/tools/shopify-app-detector" },
  openGraph: {
    title: "Shopify App Detector — see what apps any store uses",
    description:
      "Paste a Shopify store URL and see which apps it runs and which theme it uses. Free, no signup.",
    url: "https://makerpeek.com/tools/shopify-app-detector",
    type: "website",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopify App Detector — see what apps any store uses",
    description:
      "Paste a Shopify store URL and see which apps it runs and which theme it uses. Free, no signup.",
    images: ["/og-image.png"],
  },
};

const faq = [
  {
    question: "What Shopify apps is this website using?",
    answer:
      "Paste the store's address above. This tool reads the storefront's own public HTML and matches the scripts it loads against 161 known Shopify app signatures, then shows you which pattern matched for each one.",
  },
  {
    question: "How do I see what theme a Shopify store uses?",
    answer:
      "The same check reads the theme name the storefront publishes in its own Shopify.theme or ShopifyAnalytics data. If a store hides it or runs a custom build, no name is shown rather than a guess.",
  },
  {
    question: "Is this accurate?",
    answer:
      "It shows what the storefront publishes and names the evidence for each match. Apps that load no public script, or load one only during checkout, won't appear. Confirmed matches hit a known vendor domain; likely and possible matches come from weaker markers in the page.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default async function ShopifyAppDetectorPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const params = await searchParams;
  const storeParam = typeof params.store === "string" ? params.store.slice(0, 200) : "";

  let result: DetectResult | null = null;
  if (storeParam) {
    const host = normalizeStoreInput(storeParam);
    const cached = host ? getCached<DetectResult>(host) : null;

    if (cached) {
      result = cached;
    } else {
      const hdrs = await headers();
      const ip =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        hdrs.get("x-real-ip") ||
        "unknown";
      const { allowed, retryAfterSec } = checkRateLimit(ip);

      if (!allowed) {
        result = {
          ok: false,
          host,
          error: `That's a lot of lookups. Try again in ${retryAfterSec} seconds — or install the extension and check stores as you browse, with no limit like this one.`,
        };
      } else {
        result = await detectStore(storeParam);
        if (result.ok && host) setCached(host, result);
      }
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="site-nav" aria-label="Main">
        <div className="container site-nav-inner">
          <Link href="/" className="logo">
            MakerPeek
          </Link>
          <div className="nav-links">
            <Link href="/#pricing">Pricing</Link>
            <a
              href={CHROME_STORE_URL}
              className="btn btn-primary nav-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Chrome — Free
            </a>
          </div>
        </div>
      </nav>

      <header className="section alt-hero">
        <div className="container">
          <p className="hero-eyebrow">Free tool · No signup</p>
          <h1>Shopify App Detector</h1>
          <p className="hero-sub">
            Paste a Shopify store address and see which apps it runs and which theme it
            uses. Everything below is read from the storefront&apos;s own public code, and
            each result shows the pattern that matched it.
          </p>

          <form className="tool-form" action="/tools/shopify-app-detector" method="get">
            <label className="tool-label" htmlFor="store">
              Store address
            </label>
            <div className="tool-row">
              <input
                id="store"
                name="store"
                type="text"
                inputMode="url"
                autoComplete="off"
                placeholder="allbirds.com"
                defaultValue={storeParam}
                className="tool-input"
                required
              />
              <button type="submit" className="btn btn-primary">
                Detect apps
              </button>
            </div>
          </form>
        </div>
      </header>

      {result && (
        <section className="section" aria-labelledby="result-heading">
          <div className="container">
            <h2 id="result-heading" className="section-title">
              {result.ok ? result.host : "Couldn't check that one"}
            </h2>

            {!result.ok && <p className="tool-error">{result.error}</p>}

            {result.ok && !result.isShopify && (
              <p className="tool-error">
                That doesn&apos;t look like a Shopify storefront — no Shopify CDN or theme
                data in its public code. This tool only works on Shopify stores.
              </p>
            )}

            {result.ok && result.isShopify && (
              <>
                <p className="tool-summary">
                  <strong>{result.apps.length}</strong>{" "}
                  {result.apps.length === 1 ? "app" : "apps"} detected
                  {result.theme ? (
                    <>
                      {" · theme: "}
                      <strong>{result.theme}</strong>{" "}
                      <span className="tool-src">({result.themeSource})</span>
                    </>
                  ) : (
                    " · theme not published"
                  )}
                </p>

                {result.apps.length > 0 ? (
                  <div className="alt-table-wrap">
                    <table className="alt-table">
                      <thead>
                        <tr>
                          <th scope="col">App</th>
                          <th scope="col">Category</th>
                          <th scope="col">Confidence</th>
                          <th scope="col">Matched on</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.apps.map((app) => (
                          <tr key={app.name}>
                            <th scope="row">{app.name}</th>
                            <td>{app.category}</td>
                            <td>{app.confidence}</td>
                            <td>
                              <code className="tool-code">{app.evidence}</code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="tool-error">
                    No known app signatures in this store&apos;s public code. Some stores
                    load app scripts only at checkout, where a public page check can&apos;t
                    see them.
                  </p>
                )}

                <div className="tool-upsell">
                  <p>
                    This page checks one store at a time from the outside. The extension
                    runs on the store as you browse it and adds the catalog size, price
                    distribution, bestsellers and launch cadence — no pasting URLs.
                  </p>
                  <a
                    href={CHROME_STORE_URL}
                    className="btn btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Check any store in one click — Free
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="section section--faq" aria-labelledby="tool-faq-heading">
        <div className="container">
          <h2 id="tool-faq-heading" className="section-title">
            Questions.
          </h2>
          <div className="faq">
            {faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p className="answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="site-footer-row">
            <Link href="/" className="logo">
              MakerPeek
            </Link>
            <div className="site-footer-links">
              <Link href="/privacy">Privacy</Link>
              <a href="mailto:hello@makerpeek.com">Contact</a>
            </div>
          </div>
          <p className="disclaimer">
            MakerPeek is not affiliated with or endorsed by Shopify Inc. This tool reads
            public storefront pages at request time. Nothing is cached server-side or
            resold. App names are trademarks of their respective owners and are used for
            identification only.
          </p>
        </div>
      </footer>
    </>
  );
}
