# MakerPeek

Shopify store research, directly in your browser.

MakerPeek is a Chrome extension built for Shopify sellers, dropshippers, and ecommerce researchers. It surfaces competitor product data and store insights without requiring you to leave the page or juggle multiple tools.

Every metric is sourced from public store data (`/products.json`, `/collections.json`, DOM) with a click-to-verify tooltip on each number. It surfaces catalog stats, pricing patterns, app stack detection, store maturity, launch cadence, Pro watchlist change alerts (background checks roughly every 6 hours), and richer catalog views for subscribers.

**Status:** Live and published on the Chrome Web Store. Actively maintained. Built and shipped solo.

- **Chrome Web Store:** https://chromewebstore.google.com/detail/makerpeek-shopify-store-r/gdnlmpkemmeemdecdcpbnmjjfipdgmfm
- **Website:** [makerpeek.com](https://www.makerpeek.com/)

**Pricing:** $11/mo · $99/yr · Single tier.

---

## What it does

- Pulls product and store data from any Shopify store while you browse.
- Surfaces pricing, product structure, and store details in a clean browser overlay.
- Every number is click-to-verify against its public data source.
- Built on Chrome Manifest V3 for performance and compliance with current Chrome Web Store standards.

## Who it's for

Shopify sellers and ecommerce founders who do competitor research manually today and want a faster, cleaner workflow directly in the browser.

---

## Prerequisites

- Node.js 20+
- npm (or pnpm — swap `npm` for `pnpm` throughout)
- A Supabase project (free tier is fine for dev)
- A Stripe account with two products created (monthly + annual)
- Chrome 120+ (for extension development)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/Monteverde1/makerpeek.git
cd makerpeek

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Then edit .env.local and fill in every value

# 4. Start the dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## API routes (stubs)

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/enrich/products` | Fetch + enrich all products for a store URL |
| `POST` | `/api/enrich/store` | Store-level supplier / niche analysis |
| `POST` | `/api/auth/magic-link` | Send Supabase magic-link email |
| `POST` | `/api/stripe/checkout` | Create Stripe Checkout session |
| `POST` | `/api/stripe/webhook` | Handle Stripe webhook events |
| `GET`  | `/api/rate-limit` | Check free-tier usage for IP/fingerprint |

---

## Chrome extension — load unpacked

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo
5. Navigate to any Shopify store — the MakerPeek overlay will appear

See [`extension/README.md`](./extension/README.md) for more details.

---

## Project structure

```
makerpeek/
├── app/                  Next.js 15 App Router
│   ├── api/              Backend API routes
│   ├── (marketing)/      Landing page, privacy policy
│   └── dashboard/        Authenticated user dashboard
├── extension/            Chrome MV3 extension
├── makerpeek-landing/    Standalone Next.js landing site
├── shared/types.ts       TypeScript types (shared by backend + extension)
├── lib/                  Third-party client init (Supabase, Stripe)
└── .env.example          All required environment variables
```

---

## Stack

- **Frontend/Backend:** Next.js 15 (App Router) on Vercel
- **Database + Auth:** Supabase (Postgres, magic-link auth)
- **Payments:** Stripe Checkout
- **Extension:** Chrome MV3, vanilla JS content scripts
