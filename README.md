# MakerPeek

Honest seller research for POD-focused Shopify shops. Surfaces sales estimates, POD supplier detection, niche/theme extraction, margin estimation, and design velocity on any public Shopify store.

**Pricing:** $14/mo · $129/yr · Single tier.

---

## Prerequisites

- Node.js 20+
- npm (or pnpm — swap `npm` for `pnpm` throughout)
- A Supabase project (free tier is fine for dev)
- A Stripe account with two products created (monthly + annual)
- An Anthropic API key (Claude — used for paid-tier AI features only)
- Chrome 120+ (for extension development)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/makerpeek.git
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
├── shared/types.ts       TypeScript types (shared by backend + extension)
├── lib/                  Third-party client init (Supabase, Stripe, Anthropic)
└── .env.example          All required environment variables
```

---

## Stack

- **Frontend/Backend:** Next.js 15 (App Router) on Vercel
- **Database + Auth:** Supabase (Postgres, magic-link auth)
- **Payments:** Stripe Checkout
- **AI:** Anthropic Claude (Sonnet — paid tier only)
- **Extension:** Chrome MV3, vanilla JS content scripts
