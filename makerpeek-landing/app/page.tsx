import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/gdnlmpkemmeemdecdcpbnmjjfipdgmfm";

function publicFileExists(filename: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", filename));
}

const hasDemoVideo =
  publicFileExists("demo.mp4") || publicFileExists("demo.webm");

const faqItems = [
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
] as const;

export default function HomePage() {
  return (
    <>
      <nav className="site-nav" aria-label="Main">
        <div className="container site-nav-inner">
          <Link href="/" className="logo">
            MakerPeek
          </Link>
          <div className="nav-links">
            <a href="#pro">Pro</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
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

      <header className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-eyebrow">Chrome extension · Free</p>
            <h1>See inside any Shopify store in one click.</h1>
            <p className="hero-sub">
              Overview, pricing tiers, bestsellers, and a categorized app stack — free on
              every Shopify storefront.
            </p>
            <div className="hero-ctas">
              <a
                href={CHROME_STORE_URL}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Chrome — Free
              </a>
              <a href="#demo" className="text-link">
                Watch demo ↓
              </a>
            </div>
            <p className="hero-note">Works on any Shopify store · No signup</p>
          </div>
          <div className="hero-visual">
            <Image
              src="/hero-shot.png"
              width={520}
              height={867}
              alt="MakerPeek panel on a Shopify store"
              className="hero-shot"
              priority
            />
          </div>
        </div>
      </header>

      <div className="proof-strip">
        <p>
          Built for Shopify<span>·</span>Works on every store<span>·</span>5 free views/day
          <span>·</span>No account needed
        </p>
      </div>

      <section id="demo" className="section demo-video" aria-labelledby="demo-heading">
        <div className="container">
          <h2 id="demo-heading" className="section-title">
            See it in action
          </h2>
          {hasDemoVideo ? (
            <video
              className="demo-video-player"
              controls
              playsInline
              preload="metadata"
              poster="/hero-panel.png"
            >
              {publicFileExists("demo.mp4") && <source src="/demo.mp4" type="video/mp4" />}
              {publicFileExists("demo.webm") && <source src="/demo.webm" type="video/webm" />}
            </video>
          ) : (
            <div className="demo-video-placeholder">
              <p>demo video coming</p>
              <span>Drop public/demo.mp4 or public/demo.webm to replace this slot</span>
            </div>
          )}
        </div>
      </section>

      <section id="pro" className="pro-hook" aria-labelledby="pro-heading">
        <div className="container">
          <p className="eyebrow">Pro · $11/mo</p>
          <h2 id="pro-heading">
            Watch their store. See their bestsellers. Know what&apos;s working.
          </h2>
          <p className="sub">
            Track 25 Shopify competitors. Desktop alerts when they launch, reprice, or sell
            out.
          </p>
          <Image
            src="/watchlist-shot.png"
            width={780}
            height={439}
            alt="MakerPeek watchlist change alert"
            className="watchlist-mock"
          />
          <div className="cta-stack">
            <a
              href={CHROME_STORE_URL}
              className="btn btn-pro"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Pro — $11/mo
            </a>
            <a
              href={CHROME_STORE_URL}
              className="text-link text-link--light"
              target="_blank"
              rel="noopener noreferrer"
            >
              or $81/year — save $51
            </a>
          </div>
        </div>
      </section>

      <section id="pricing" className="section">
        <div className="container">
          <h2 className="section-title">
            Free forever. Pro when you need to scale your research.
          </h2>
          <div className="pricing-grid">
            <article className="price-card">
              <div className="tier">Free</div>
              <div className="amount">$0</div>
              <p className="amount-note">forever</p>
              <ul>
                <li>5 store views per day</li>
                <li>Overview, activity, store maturity &amp; profile</li>
                <li>Pricing distribution with product counts</li>
                <li>Top 3 bestsellers (Shopify best-selling sort)</li>
                <li>3 apps in categorized app stack</li>
                <li>6-month launch cadence</li>
              </ul>
              <a
                href={CHROME_STORE_URL}
                className="btn btn-primary btn-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Chrome — Free
              </a>
            </article>

            <article className="price-card pro">
              <span className="pill">Most popular</span>
              <div className="tier">Pro</div>
              <div className="amount">
                $11<span className="amount-suffix">/mo</span>
              </div>
              <p className="amount-note">or $81/year — save $51</p>
              <ul>
                <li>
                  <strong>Unlimited store views</strong>
                </li>
                <li>
                  <strong>See all 25 bestsellers</strong> (Free: top 3)
                </li>
                <li>
                  <strong>Full app stack categorized</strong> (Free: 3 apps)
                </li>
                <li>
                  <strong>Track 25 stores with change alerts</strong>
                </li>
                <li>Full launch history</li>
                <li>Price locked forever</li>
              </ul>
              <a
                href={CHROME_STORE_URL}
                className="btn btn-primary btn-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Pro
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="section section--faq">
        <div className="container">
          <h2 className="section-title">Questions.</h2>
          <div className="faq">
            {faqItems.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p className="answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <h2>Stop guessing what they&apos;re selling.</h2>
        <p className="sub">One click. Every Shopify store. Free.</p>
        <a
          href={CHROME_STORE_URL}
          className="btn btn-primary btn-primary--on-dark"
          target="_blank"
          rel="noopener noreferrer"
        >
          Add to Chrome — Free
        </a>
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
          <div className="site-footer-row">
            <small>© 2026 MakerPeek</small>
          </div>
          <p className="disclaimer">
            MakerPeek is not affiliated with or endorsed by Shopify Inc. All data is fetched
            from public store endpoints at view time and is not cached server-side or resold.
          </p>
        </div>
      </footer>
    </>
  );
}
