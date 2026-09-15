/**
 * Competitor facts below are taken from each product's own public marketing
 * pages (fetched Sept 2026). Do not add a claim here that is not stated on
 * their site — state what they advertise, not what we assume.
 */

export type AltRow = { label: string; makerpeek: string; them: string };

export type Alternative = {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sourceNote: string;
  rows: AltRow[];
  whenThem: string[];
  faq: { question: string; answer: string }[];
};

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/gdnlmpkemmeemdecdcpbnmjjfipdgmfm";

export { CHROME_STORE_URL };

export const alternatives: Alternative[] = [
  {
    slug: "koala-inspector-alternative",
    competitor: "Koala Inspector",
    title: "Koala Inspector alternative: MakerPeek",
    description:
      "MakerPeek is a Shopify app detector and store research extension where every number links back to the public endpoint it came from. No modelled revenue estimates. Free, no account.",
    h1: "A Koala Inspector alternative for people who want to check the numbers",
    intro:
      "Both are Chrome extensions that open on a Shopify storefront and tell you about the store. The difference is what happens when you ask where a number came from.",
    sourceNote:
      "Koala Inspector details below are quoted from koala-apps.io, September 2026. Pricing and features change — check their site before deciding.",
    rows: [
      {
        label: "Free tier",
        makerpeek: "5 store views per day, no account",
        them: "15 analyses per month, no credit card",
      },
      {
        label: "Paid",
        makerpeek: "$11/mo or $81/year",
        them: "$22/mo for 220 tokens; token packs from $3.99",
      },
      {
        label: "Store tracking",
        makerpeek: "25 stores with change alerts",
        them: "Up to 50 stores",
      },
      {
        label: "App detection",
        makerpeek:
          "80+ apps matched on public script signatures, categorized. 3 free, full stack on Pro",
        them: "App Detector",
      },
      {
        label: "Theme detection",
        makerpeek:
          "Yes \u2014 read from the storefront\u2019s own Shopify.theme / ShopifyAnalytics data, with the source shown",
        them: "Theme Detector",
      },
      {
        label: "Revenue / sales estimates",
        makerpeek: "None. We don't model numbers we can't show you",
        them: "Estimated sales and traffic",
      },
      {
        label: "Where the numbers come from",
        makerpeek:
          "Public Shopify endpoints, fetched at view time. Every figure links to its source so you can open it yourself",
        them:
          "Their FAQ: estimates “modeled from public signals rather than the store’s private backend”",
      },
      {
        label: "Data handling",
        makerpeek: "Not cached server-side, not resold",
        them: "Not stated on their site",
      },
    ],
    whenThem: [
      "You want an estimated monthly revenue figure. MakerPeek deliberately doesn't produce one — if a number on the screen is the deliverable, Koala Inspector gives you one and we don't.",
      "You want ad campaign visibility, or CSV and Excel export.",
      "You track more than 25 stores.",
    ],
    faq: [
      {
        question: "Is MakerPeek a Koala Inspector alternative?",
        answer:
          "For app stack, catalog and pricing research, yes. MakerPeek shows the categorized app stack, price distribution, bestsellers and launch cadence, and every figure cites the public Shopify endpoint it came from. It detects the store\u2019s theme too. What it does not do is produce revenue or traffic estimates.",
      },
      {
        question: "Why doesn't MakerPeek show estimated revenue?",
        answer:
          "Because a public storefront doesn't expose order data. Any revenue figure is a model, not a measurement. We show what the store actually publishes and link you to it, so you can verify anything you're about to act on.",
      },
      {
        question: "What does MakerPeek cost?",
        answer:
          "Free for 5 store views a day with no account. Pro is $11 a month or $81 a year and adds unlimited views, the full app stack, all 25 bestsellers and a 25-store watchlist with change alerts.",
      },
    ],
  },
  {
    slug: "ppspy-alternative",
    competitor: "PPSPY",
    title: "PPSPY alternative: MakerPeek",
    description:
      "MakerPeek is a Shopify store research extension built on public endpoint data you can verify, rather than predicted order numbers. Free, no account, $11/mo for Pro.",
    h1: "A PPSPY alternative that doesn’t predict your competitor’s orders",
    intro:
      "PPSPY leads with predicted sales data. MakerPeek takes the opposite position: it only shows you things a Shopify storefront actually publishes, and links you to the source for each one.",
    sourceNote:
      "PPSPY details below are quoted from ppspy.com, September 2026. They don’t publish pricing on their homepage, so none is stated here.",
    rows: [
      {
        label: "Core claim",
        makerpeek:
          "Every figure comes from a public Shopify endpoint and links back to it",
        them:
          "Their site: a “proprietary AI powered algorithm predicts order data”",
      },
      {
        label: "Sales figures",
        makerpeek: "None. Not modelled, not estimated",
        them: "Sales Tracking, 15-day sales report",
      },
      {
        label: "App stack",
        makerpeek:
          "80+ apps matched on public script signatures, categorized. 3 free, full stack on Pro",
        them: "Not advertised as a standalone feature",
      },
      {
        label: "Theme detection",
        makerpeek:
          "Yes \u2014 read from the storefront\u2019s own Shopify.theme / ShopifyAnalytics data, with the source shown",
        them: "Store Theme",
      },
      {
        label: "Ads",
        makerpeek: "Not offered",
        them: "Ads, Ad Tracker",
      },
      {
        label: "Store discovery",
        makerpeek: "No. You bring the store, we read it",
        them: "Shop Explorer, filter stores by revenue and keywords",
      },
      {
        label: "Free tier",
        makerpeek: "5 store views per day, no account",
        them: "Free trial, no credit card",
      },
      {
        label: "Paid",
        makerpeek: "$11/mo or $81/year",
        them: "Not published on their homepage",
      },
    ],
    whenThem: [
      "You want to discover stores you don't already know about. MakerPeek has no store directory — you open a storefront and it reads that store.",
      "You want predicted order volumes and revenue rankings, and you're comfortable acting on a model.",
      "You research competitor ad creative.",
    ],
    faq: [
      {
        question: "Is MakerPeek a PPSPY alternative?",
        answer:
          "For researching a specific Shopify store you already have in front of you, yes. MakerPeek reads that store's public endpoints and shows its catalog, pricing spread, bestsellers, launch cadence and app stack. It has no store discovery directory and it does not predict sales.",
      },
      {
        question: "What Shopify apps is this website using?",
        answer:
          "MakerPeek answers that on any public Shopify storefront. Install the extension, open the store, and the categorized app stack lists the apps it detected by matching public script signatures — three on the free tier, the full stack on Pro.",
      },
      {
        question: "Why no predicted sales data?",
        answer:
          "A storefront doesn't publish order data, so any sales figure is inferred. MakerPeek's position is that a number you can't open and check isn't research. Everything it shows, you can verify yourself in one click.",
      },
    ],
  },
];

export function getAlternative(slug: string): Alternative | undefined {
  return alternatives.find((a) => a.slug === slug);
}

export function altFaqJsonLd(alt: Alternative) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alt.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
