import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — MakerPeek",
  description: "How MakerPeek handles your data.",
};

const LAST_UPDATED = "May 13, 2026";

export default function PrivacyPage() {
  return (
    <div className="bg-cream min-h-screen">
      <header className="px-6 py-5 border-b border-beige">
        <div className="max-w-5xl mx-auto">
          <a
            href="/"
            className="font-serif text-xl font-semibold tracking-tight text-forest hover:opacity-80 transition-opacity"
          >
            MakerPeek
          </a>
        </div>
      </header>

      <main className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-soft mb-12">Last updated: {LAST_UPDATED}</p>

          <div className="prose-makerpeek">

            <Section title="Overview">
              <p>
                MakerPeek is a Chrome extension with an optional paid account. This policy
                explains what data is collected, where it goes, and what is never collected.
                The short version: the extension works entirely on your device. No browsing
                data leaves it unless you choose to create a Pro account.
              </p>
            </Section>

            <Section title="What the extension collects">
              <p>The extension stores one thing on your device, in Chrome&rsquo;s local storage:</p>
              <ul>
                <li>
                  <strong>Daily usage count</strong> — an integer tracking how many stores
                  you have analysed today, used to enforce the free-tier limit of 10
                  stores per day. This resets at midnight UTC. It never leaves your device.
                </li>
              </ul>
              <p>
                This data lives in <code>chrome.storage.local</code>. It is not synced to
                Chrome&rsquo;s cloud sync and is deleted when you uninstall the extension.
              </p>
            </Section>

            <Section title="What the extension does NOT collect">
              <ul>
                <li>Your browsing history</li>
                <li>The URLs of stores you visit or analyse</li>
                <li>Any product data, prices, or results you view in the panel</li>
                <li>Your IP address</li>
                <li>Device identifiers or fingerprints</li>
                <li>Cookies or any other site data</li>
              </ul>
              <p>
                When you open MakerPeek on a Shopify store, the extension fetches that
                store&rsquo;s public <code>/products.json</code> endpoint directly from
                your browser. That request goes from your browser to the store — it does
                not pass through MakerPeek servers.
              </p>
            </Section>

            <Section title="Data that leaves your device">
              <p>
                Nothing leaves your device unless you explicitly sign up for a Pro account.
              </p>
              <p>
                When you sign up for Pro:
              </p>
              <ul>
                <li>
                  <strong>Email address</strong> — collected at sign-up via a magic link.
                  Stored in Supabase (see Third Parties below) and used only for
                  authentication and account management.
                </li>
                <li>
                  <strong>Payment information</strong> — handled entirely by Stripe. We
                  receive a Stripe Customer ID but never see or store card numbers.
                </li>
              </ul>
              <p>
                We do not sell, rent, or share your personal information with any third
                party for advertising or analytics purposes.
              </p>
            </Section>

            <Section title="Third parties">
              <p>
                MakerPeek uses three infrastructure providers. Each receives only the
                minimum data necessary for their function:
              </p>
              <ul>
                <li>
                  <strong>Stripe</strong> — payment processing for Pro subscriptions.
                  Stripe receives your payment details and issues a customer ID. Stripe&rsquo;s
                  privacy policy is at{" "}
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                    stripe.com/privacy
                  </a>.
                </li>
                <li>
                  <strong>Supabase</strong> — authentication and account storage for Pro
                  users. Stores your email address and subscription status. Supabase&rsquo;s
                  privacy policy is at{" "}
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                    supabase.com/privacy
                  </a>.
                </li>
                <li>
                  <strong>Vercel</strong> — hosting provider for the MakerPeek web app and
                  API. Vercel processes requests transiently and does not store personal data
                  on our behalf. Vercel&rsquo;s privacy policy is at{" "}
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                    vercel.com/legal/privacy-policy
                  </a>.
                </li>
              </ul>
            </Section>

            <Section title="Data retention">
              <p>
                If you cancel your Pro subscription and request deletion of your account,
                your email address and associated account data will be permanently deleted
                from our systems within 30 days of that request.
              </p>
              <p>
                To request deletion, email{" "}
                <a href="mailto:support@makerpeek.com">support@makerpeek.com</a> with the
                subject line &ldquo;Delete my account.&rdquo;
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                If we make material changes to this policy, we will update the date at the
                top of this page. Continued use of MakerPeek after a change constitutes
                acceptance of the updated policy.
              </p>
            </Section>

            <Section title="Contact" last>
              <p>
                Questions about privacy? Email us at{" "}
                <a href="mailto:support@makerpeek.com">support@makerpeek.com</a>.
                We aim to respond within two business days.
              </p>
            </Section>

          </div>
        </div>
      </main>

      <footer className="px-6 py-10 border-t border-beige">
        <div className="max-w-2xl mx-auto text-sm text-ink-soft">
          <span className="font-serif">&copy; 2026 MakerPeek</span>
          <span className="mx-3">·</span>
          <a href="/" className="hover:text-ink">Home</a>
          <span className="mx-3">·</span>
          <a href="mailto:support@makerpeek.com" className="hover:text-ink">
            support@makerpeek.com
          </a>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-10"}>
      <h2 className="font-serif text-xl font-semibold text-ink mb-4">{title}</h2>
      <div className="space-y-4 text-ink-soft leading-relaxed text-[15px]">
        {children}
      </div>
    </section>
  );
}
