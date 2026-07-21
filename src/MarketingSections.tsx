import {
  DEPLOYMENT_TX,
  EXPLORER_LINKS,
  INITIAL_HOLDER,
  OFFICIAL_CHANNELS,
  PROJECT_CONTACT,
} from './content'
import { UI_COPY, type Language } from './i18n'
import { TOKEN } from './wallet'
import type { ReactNode } from 'react'

type MarketingSectionsProps = {
  language: Language
  copyText: (text: string, successText: string) => Promise<void>
}

function ExternalLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}<span aria-hidden="true"> ↗</span>
      <span className="visually-hidden">{label}</span>
    </a>
  )
}

export function MarketingSections({ language, copyText }: MarketingSectionsProps) {
  const s = UI_COPY[language]
  const m = s.marketing

  return (
    <>
      <section className="story-section section-shell" id="about" aria-labelledby="about-title">
        <div className="section-intro">
          <span className="section-label">WHAT IS GXLY</span>
          <h2 id="about-title">{m.aboutTitle[0]}<br />{m.aboutTitle[1]}</h2>
          <p>{m.aboutDescription}</p>
        </div>

        <div className="fact-grid" aria-label={m.factsAria}>
          {m.facts.map((fact) => (
            <article className="fact-card" key={fact.title}>
              <span>{fact.title}</span>
              <h3>{fact.value}</h3>
              <p>{fact.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ledger-section section-shell" id="token" aria-labelledby="ledger-title">
        <div className="ledger-heading">
          <div>
            <span className="section-label">ONCHAIN LEDGER</span>
            <h2 id="ledger-title">{m.ledgerTitle}</h2>
          </div>
          <ExternalLink href={EXPLORER_LINKS.token} label={s.externalNewWindow}>{m.viewRecords}</ExternalLink>
        </div>

        <dl className="token-ledger">
          <div><dt>{m.ledger.name}</dt><dd>Galaxy / GXLY</dd></div>
          <div><dt>{m.ledger.network}</dt><dd>Base Mainnet · 8453</dd></div>
          <div><dt>{m.ledger.supply}</dt><dd>{TOKEN.supply} GXLY</dd></div>
          <div><dt>{m.ledger.decimals}</dt><dd>{TOKEN.decimals}</dd></div>
          <div><dt>{m.ledger.initialHolder}</dt><dd><code>{INITIAL_HOLDER}</code></dd></div>
          <div><dt>{m.ledger.distribution}</dt><dd>{m.ledger.distributionValue}</dd></div>
        </dl>

        <div className="contract-verify">
          <div>
            <span>{m.uniqueContract}</span>
            <code>{TOKEN.address}</code>
          </div>
          <button type="button" onClick={() => copyText(TOKEN.address, s.wallet.notices.contractCopied)}>
            {m.copyContract}
          </button>
        </div>
      </section>

      <section className="progress-section section-shell" id="status" aria-labelledby="status-title">
        <div className="section-intro compact">
          <span className="section-label">PUBLISHED STATUS</span>
          <h2 id="status-title">{m.progressTitle}</h2>
          <p>{m.progressDescription}</p>
        </div>

        <ol className="milestone-list">
          {m.milestones.map((milestone) => (
            <li key={milestone.title}>
              <span className="complete-mark" aria-hidden="true">✓</span>
              <div><h3>{milestone.title}</h3><p>{milestone.detail}</p></div>
              <strong>{m.completed}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="trust-section section-shell" aria-labelledby="trust-title">
        <div className="trust-copy">
          <span className="section-label">VERIFY, DON'T TRUST</span>
          <h2 id="trust-title">{m.trustTitle}</h2>
          <p>{m.trustDescription}</p>
        </div>
        <div className="verify-links">
          <ExternalLink href={EXPLORER_LINKS.contract} label={s.externalNewWindow}><strong>{m.sourceCode}</strong><span>BaseScan verified code</span></ExternalLink>
          <ExternalLink href={EXPLORER_LINKS.deployment} label={s.externalNewWindow}><strong>{m.deployment}</strong><span>{DEPLOYMENT_TX.slice(0, 12)}…</span></ExternalLink>
          <ExternalLink href={EXPLORER_LINKS.blockscout} label={s.externalNewWindow}><strong>{m.secondExplorer}</strong><span>Blockscout cross-check</span></ExternalLink>
        </div>
        <div className="channel-status">
          <strong>{m.officialChannels}</strong>
          {OFFICIAL_CHANNELS.length > 0 ? (
            <div>{OFFICIAL_CHANNELS.map((channel) => <ExternalLink key={channel.label} href={channel.url} label={s.externalNewWindow}>{channel.label}</ExternalLink>)}</div>
          ) : (
            <p>{m.noChannels}</p>
          )}
        </div>
        <div className="project-contact">
          <div>
            <strong>{m.projectContactTitle}</strong>
            <p>{m.projectContactDescription}</p>
          </div>
          <dl>
            <div>
              <dt>{m.projectMaintainer}</dt>
              <dd><ExternalLink href={PROJECT_CONTACT.profile} label={s.externalNewWindow}>{PROJECT_CONTACT.name}</ExternalLink></dd>
            </div>
            <div>
              <dt>{m.projectEmail}</dt>
              <dd><a href={`mailto:${PROJECT_CONTACT.email}`}>{PROJECT_CONTACT.email}</a></dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="faq-section section-shell" id="faq" aria-labelledby="faq-title">
        <div className="section-intro compact">
          <span className="section-label">FAQ</span>
          <h2 id="faq-title">{m.faqTitle}</h2>
        </div>
        <div className="faq-list">
          {m.faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}<span aria-hidden="true">+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <aside className="risk-note section-shell" aria-labelledby="risk-title">
        <span aria-hidden="true">!</span>
        <div>
          <h2 id="risk-title">{m.riskTitle}</h2>
          <p>{m.riskDescription}</p>
        </div>
      </aside>
    </>
  )
}
