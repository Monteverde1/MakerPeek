import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://makerpeek.com",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://makerpeek.com/pricing",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://makerpeek.com/koala-inspector-alternative",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://makerpeek.com/ppspy-alternative",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://makerpeek.com/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
