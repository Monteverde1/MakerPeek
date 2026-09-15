export const faqItems = [
  {
    question: "Does it work on every Shopify store?",
    answer:
      "Yes. Any public Shopify storefront. The extension stays inactive on non-Shopify sites.",
  },
  {
    question: "Do I need an account?",
    answer:
      "Not for free. Pro requires a login so your watchlist syncs across devices.",
  },
  {
    question: "What if I cancel Pro?",
    answer:
      "Monthly cancels immediately. Annual renews yearly with a 14-day reminder and one-click opt-out.",
  },
  {
    question: "Will you raise the price?",
    answer:
      "No. $11/mo and $81/yr stay locked for as long as you stay subscribed.",
  },
  {
    question: "What Shopify apps is this website using?",
    answer:
      "MakerPeek detects them on any public Shopify store. Open the store with the Chrome extension installed and the categorized app stack lists the apps — three free, the full stack on Pro.",
  },
] as const;

export const faqPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};
