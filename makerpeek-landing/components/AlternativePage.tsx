import Link from "next/link";
import {
  CHROME_STORE_URL,
  altFaqJsonLd,
  type Alternative,
} from "@/lib/alternatives";

export default function AlternativePage({ alt }: { alt: Alternative }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(altFaqJsonLd(alt)) }}
      />

      <nav className="site-nav" aria-label="Main">
        <div className="container site-nav-inner">
          <Link href="/" className="logo">
            MakerPeek
          </Link>
          <div className="nav-links">
            <Link href="/#pricing">Pricing</Link>
            <Link href="/#faq">FAQ</Link>
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
          <p className="hero-eyebrow">Comparison</p>
          <h1>{alt.h1}</h1>
          <p className="hero-sub">{alt.intro}</p>
          <div className="hero-ctas">
            <a
              href={CHROME_STORE_URL}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Chrome — Free
            </a>
            <Link href="/" className="text-link">
              See what MakerPeek shows →
            </Link>
          </div>
          <p className="hero-note">5 free store views a day · No account</p>
        </div>
      </header>

      <section className="section" aria-labelledby="compare-heading">
        <div className="container">
          <h2 id="compare-heading" className="section-title">
            MakerPeek vs {alt.competitor}
          </h2>
          <div className="alt-table-wrap">
            <table className="alt-table">
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">MakerPeek</th>
                  <th scope="col">{alt.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {alt.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.makerpeek}</td>
                    <td>{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="alt-source">{alt.sourceNote}</p>
        </div>
      </section>

      <section className="section section--faq" aria-labelledby="when-heading">
        <div className="container">
          <h2 id="when-heading" className="section-title">
            When {alt.competitor} is the better choice
          </h2>
          <ul className="alt-when">
            {alt.whenThem.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="alt-faq-heading">
        <div className="container">
          <h2 id="alt-faq-heading" className="section-title">
            Questions.
          </h2>
          <div className="faq">
            {alt.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p className="answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <h2>Check the numbers yourself.</h2>
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
            MakerPeek is not affiliated with or endorsed by Shopify Inc.,{" "}
            {alt.competitor}, or any other company named on this page. Product names
            are used for identification only. Competitor details are quoted from
            their own public pages and may be out of date — check their site before
            deciding.
          </p>
        </div>
      </footer>
    </>
  );
}
