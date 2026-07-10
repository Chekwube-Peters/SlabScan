export default function LandingPage({ onLaunch }) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="wordmark">SlabScan</span>
        <button className="nav-cta" onClick={onLaunch} type="button">
          Open app
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">AI-powered card valuation</p>
            <h1>Point your phone. Know what it's worth.</h1>
            <p className="landing-subhead">
              SlabScan reads any graded card in seconds — live market pricing from the Renaiss OS
              Index, plus an instant AI taste call on whether to hold, sell, or chase.
            </p>
            <button className="landing-primary-button" onClick={onLaunch} type="button">
              Scan a card
              <ArrowIcon />
            </button>
          </div>

          <div className="landing-hero-preview" aria-hidden="true">
            <div className="preview-card valuation-card">
              <div className="valuation-header">
                <span className="grading-company">PSA</span>
                <span className="grade">Grade 10 Gem Mint</span>
              </div>
              <p className="card-name">Pikachu · Pokemon Japanese SM-P Promos</p>
              <div className="price">$13,552.89</div>
              <div className="meta-row">
                <span className="confidence-badge confidence-high">high confidence</span>
                <span className="freshness">Last sale today</span>
              </div>
            </div>
            <div className="preview-card taste-card taste-chase">
              <div className="taste-label">CHASE</div>
              <p className="taste-reasoning">
                Strong, fresh pricing data backs this one — a good entry if you don't already own it.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <FeatureCard
            icon={<ScanIcon />}
            title="Instant identification"
            body="Snap a photo of any graded slab — PSA, BGS, or CGC — and SlabScan reads the cert number, grade, and card in seconds."
          />
          <FeatureCard
            icon={<PriceIcon />}
            title="Live market pricing"
            body="Real valuations pulled from live marketplace sales via the Renaiss OS Index — not a stale price guide."
          />
          <FeatureCard
            icon={<TasteIcon />}
            title="AI taste call"
            body="Get a HOLD, SELL, CHASE, or PASS call reasoned from live pricing signal and confidence — powered by Claude."
          />
        </section>

        <section className="landing-steps">
          <h2>How it works</h2>
          <ol className="steps-list">
            <li>
              <span className="step-number">1</span>
              <div>
                <h3>Snap a photo</h3>
                <p>Point your camera at the slab with the label and card both visible.</p>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div>
                <h3>We read and price it</h3>
                <p>SlabScan resolves the cert, matches the card, and pulls live comps.</p>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div>
                <h3>Get your call</h3>
                <p>See the price, confidence tier, and an instant taste read.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="landing-cta">
          <h2>Ready to see what's in your box?</h2>
          <button className="landing-primary-button" onClick={onLaunch} type="button">
            Scan your first card
            <ArrowIcon />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          Powered by{' '}
          <a href="https://renaissos.com" target="_blank" rel="noreferrer">
            Renaiss OS Index
          </a>
          . Taste reads by Claude.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TasteIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7.5-4.7-9.8-9.4C.6 7.9 2.6 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.4.5 5.4 3.9 3.8 7.6C19.5 16.3 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
