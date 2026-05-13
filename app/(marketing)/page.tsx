import WaitlistForm from "./waitlist-form";

export default function HomePage() {
  return (
    <>
      <header className="px-6 py-5 border-b border-beige">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-serif text-xl font-semibold tracking-tight">MakerPeek</div>
          <nav className="flex items-center gap-6 text-sm text-ink-soft">
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <a href="mailto:hello@makerpeek.com" className="hover:text-ink">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-soft text-forest text-xs font-medium tracking-wide uppercase mb-8">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-forest"></span>
              For independent sellers
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-ink">
              Seller research that <em className="italic font-medium text-forest">actually works</em>
              <br className="hidden md:block" />
              for digital and POD shops.
            </h1>
            <p className="mt-7 text-lg md:text-xl text-ink-soft max-w-2xl mx-auto leading-relaxed">
              MakerPeek is a Chrome extension for sellers on Shopify. It surfaces real sales estimates, supplier detection, and theme analysis on every store — built for digital downloads and print-on-demand sellers that existing tools get wrong.
            </p>
            <WaitlistForm />
          </div>
        </section>

        <section className="px-6 py-20 bg-cream-dark border-y border-beige">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-center mb-16">
              Built for the shops other tools miss.
            </h2>
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <div className="w-10 h-10 rounded-lg bg-forest-soft flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4 4L19 5" /></svg>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">POD supplier detection</h3>
                <p className="text-ink-soft leading-relaxed">Detects whether a store uses Printful, Printify, Gelato, or CustomCat by fingerprinting product handles, image URLs, and SKU patterns. Generic spy tools can't tell you this.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-forest-soft flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Theme & niche extraction</h3>
                <p className="text-ink-soft leading-relaxed">POD listings cluster around themes — cottagecore, vintage Americana, witchy, fandom. MakerPeek extracts and aggregates these from titles and tags so your keyword research reflects what's truly selling.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-forest-soft flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Honest pricing, locked forever</h3>
                <p className="text-ink-soft leading-relaxed">One paid tier. We never move features into a higher tier on existing customers. Annual renewals send a notice 14 days before charging. Monthly cancels immediately. No dark patterns.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-4">One plan. One price. Forever.</h2>
              <p className="text-ink-soft text-lg">No upsells. No &ldquo;Pro Plus.&rdquo; No moving features into a higher tier later.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-beige bg-white p-8">
                <div className="text-sm font-medium text-ink-soft uppercase tracking-wide">Free</div>
                <div className="font-serif text-5xl font-semibold mt-3">$0</div>
                <p className="text-ink-soft mt-2 text-sm">forever</p>
                <ul className="mt-6 space-y-3 text-sm text-ink">
                  <li className="flex gap-2"><span className="text-forest">✓</span> 5 store lookups per day</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> Sales estimates &amp; supplier detection</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> No signup required</li>
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-forest bg-white p-8 relative">
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-forest text-white text-xs font-semibold uppercase tracking-wide">Save $39/yr</div>
                <div className="text-sm font-medium text-forest uppercase tracking-wide">Pro</div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="font-serif text-5xl font-semibold">$14</span>
                  <span className="text-ink-soft">/ month</span>
                </div>
                <p className="text-ink-soft mt-2 text-sm">or <span className="font-medium text-ink">$129/year</span> — save $39</p>
                <ul className="mt-6 space-y-3 text-sm text-ink">
                  <li className="flex gap-2"><span className="text-forest">✓</span> Unlimited store lookups</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> AI theme extraction &amp; niche analysis</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> Margin estimation per product</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> Design velocity tracking</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> Priority email support</li>
                  <li className="flex gap-2"><span className="text-forest">✓</span> Price locked at $14/mo, forever</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="px-6 py-20 bg-cream-dark border-y border-beige">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-center mb-12">Common questions.</h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2">Will you raise prices or move features into a higher tier later?</h3>
                <p className="text-ink-soft leading-relaxed">No. The $14/month and $129/year plans are locked at those prices for every customer who signs up, for as long as you stay subscribed. New features for advanced users would go to a new tier; existing plans stay exactly as bought.</p>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2">Where does MakerPeek get its data?</h3>
                <p className="text-ink-soft leading-relaxed">From Shopify&rsquo;s public /products.json endpoint, fetched only when you actively view a store. No bulk crawling, no data resale.</p>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2">What if I cancel?</h3>
                <p className="text-ink-soft leading-relaxed">Monthly renews automatically each month. Cancel anytime from your account — no questions, no friction, effective immediately. Annual renews automatically each year. You&rsquo;ll get a reminder 14 days before your renewal date with a clear opt-out link.</p>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2">Does it work for non-POD Shopify shops?</h3>
                <p className="text-ink-soft leading-relaxed">Yes. MakerPeek works for any Shopify store. POD-specific intelligence (supplier detection, base product analysis, margin estimation) shows when relevant; general sales and theme data shows for every store.</p>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2">When does it launch?</h3>
                <p className="text-ink-soft leading-relaxed">Aiming for late May 2026. Waitlist members get early access and 20% off the first year.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-4">Be the first to know.</h2>
            <p className="text-ink-soft text-lg mb-8">Join the waitlist and get 20% off your first year at launch.</p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="px-6 py-10 border-t border-beige bg-cream">
        <div className="max-w-5xl mx-auto flex flex-col gap-4 text-sm text-ink-soft">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-serif">&copy; 2026 MakerPeek</div>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-ink">Privacy</a>
              <a href="mailto:hello@makerpeek.com" className="hover:text-ink">Contact</a>
            </div>
          </div>
          <div className="text-xs text-ink-soft/70 text-center md:text-left max-w-3xl">
            MakerPeek is an independent tool and is not affiliated with, endorsed by, or sponsored by Shopify Inc. Shopify is a trademark of Shopify Inc.
          </div>
        </div>
      </footer>
    </>
  );
}
