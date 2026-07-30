export const metadata = {
  title: "Privacy Policy | MakerPeek",
  description: "How MakerPeek handles your data.",
};

export default function Privacy() {
  return (
    <div className="privacy-page">
      <header className="privacy-nav">
        <div className="privacy-container privacy-nav-inner">
          <a href="/" className="privacy-logo">
            MakerPeek
          </a>
          <div className="privacy-nav-links">
            <a href="/#pricing">Pricing</a>
            <a href="mailto:hello@makerpeek.com">Contact</a>
          </div>
        </div>
      </header>

      <main className="privacy-main">
        <div className="privacy-container privacy-content">
          <h1>MakerPeek Privacy Policy</h1>
          <p className="privacy-updated">
            <em>Last updated: May 21, 2026</em>
          </p>

          <p>
            MakerPeek is a Chrome extension that displays publicly available data about Shopify
            stores. This policy explains what data the extension handles.
          </p>

          <section>
            <h2>What We Access</h2>
            <p>
              When you visit a Shopify store, MakerPeek reads the page URL and public store data
              (product listings, pricing, installed app signatures, and catalog details) from the
              store&apos;s own public endpoints. This happens only on Shopify stores. The extension
              does not read, collect, or transmit data from non-Shopify websites.
            </p>
          </section>

          <section>
            <h2>What We Store</h2>
            <p>MakerPeek stores the following locally in your browser:</p>
            <ul>
              <li>
                An anonymous identifier generated on install, used to link your Pro subscription
                to your browser. This identifier is not tied to your name, email, or any personal
                information.
              </li>
              <li>Your daily usage count, to enforce the free tier limit.</li>
              <li>Your watchlist of saved stores.</li>
              <li>Cached subscription status.</li>
            </ul>
          </section>

          <section>
            <h2>What We Transmit</h2>
            <p>
              The only data sent off your device is your anonymous identifier, transmitted to our
              subscription database to verify whether you have an active Pro subscription. We do not
              transmit your browsing history, the stores you view, or any personally identifiable
              information.
            </p>
          </section>

          <section>
            <h2>Payments</h2>
            <p>
              Pro subscriptions are processed by Stripe. When you upgrade, you are directed to
              Stripe&apos;s hosted checkout. MakerPeek never sees or stores your payment card
              details. Stripe&apos;s handling of your payment information is governed by
              Stripe&apos;s privacy policy at{" "}
              <a href="https://stripe.com/privacy">stripe.com/privacy</a>.
            </p>
          </section>

          <section>
            <h2>What We Do Not Do</h2>
            <p>
              We do not sell or transfer your data to third parties. We do not use your data for
              advertising. We do not track you across websites. We do not collect personally
              identifiable information through the extension.
            </p>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              Locally stored data remains in your browser until you uninstall the extension or
              clear its storage. Subscription records associated with your anonymous identifier are
              retained while your subscription is active and for a reasonable period afterward for
              billing and support purposes.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy:{" "}
              <a href="mailto:hello@makerpeek.com">hello@makerpeek.com</a>
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update this policy. Material changes will be reflected in the &ldquo;Last
              updated&rdquo; date above.
            </p>
          </section>
        </div>
      </main>

      <footer className="privacy-footer">
        <div className="privacy-container">
          <small>&copy; 2026 MakerPeek</small>
          <span aria-hidden="true">&middot;</span>
          <a href="/">Home</a>
          <span aria-hidden="true">&middot;</span>
          <a href="mailto:hello@makerpeek.com">hello@makerpeek.com</a>
        </div>
      </footer>
    </div>
  );
}
