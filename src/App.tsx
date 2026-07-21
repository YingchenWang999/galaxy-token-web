import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  useBalance,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWatchAsset,
  useWriteContract,
} from 'wagmi'
import { simulateContract, waitForTransactionReceipt } from 'wagmi/actions'
import { base } from 'wagmi/chains'
import { formatUnits, zeroAddress } from 'viem'
import { EXPLORER_LINKS } from './content'
import {
  getInitialLanguage,
  LANGUAGE_STORAGE_KEY,
  localizeWalletError,
  UI_COPY,
  type Language,
} from './i18n'
import { MarketingSections } from './MarketingSections'
import {
  formatGalaxyBalance,
  GalaxyTransferValidationError,
  getWalletErrorDetail,
  isUserRejectedRequest,
  parseGalaxyTransfer,
  TOKEN,
  TOKEN_ABI,
} from './wallet'
import { openWalletPicker, wagmiConfig } from './wagmi'

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null
type BusyAction = 'connect' | 'refresh' | 'add' | 'disconnect' | 'send' | null
type TransferErrors = { recipient?: string; amount?: string }

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}

function formatBalance(value: string | undefined, maximumFractionDigits: number, locale: string) {
  if (value === undefined) return '—'
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(Number(value))
}

function describeWalletError(action: string, error: unknown, language: Language) {
  const s = UI_COPY[language]
  if (isUserRejectedRequest(error)) return s.wallet.notices.userRejected
  const detail = localizeWalletError(getWalletErrorDetail(error), language)
  return language === 'zh' ? `${action}失败：${detail}` : `${action}: ${detail}`
}

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
}

export function App() {
  const connection = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const switchChain = useSwitchChain()
  const watchAsset = useWatchAsset()
  const writeContract = useWriteContract()
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [notice, setNotice] = useState<Notice>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [showManualImport, setShowManualImport] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [transferErrors, setTransferErrors] = useState<TransferErrors>({})
  const s = UI_COPY[language]

  useEffect(() => {
    document.documentElement.lang = s.htmlLang
    document.title = s.meta.title
    setMetaContent('meta[name="description"]', s.meta.description)
    setMetaContent('meta[property="og:locale"]', s.ogLocale)
    setMetaContent('meta[property="og:title"]', s.meta.socialTitle)
    setMetaContent('meta[property="og:description"]', s.meta.socialDescription)
    setMetaContent('meta[property="og:image:alt"]', s.meta.imageAlt)
    setMetaContent('meta[name="twitter:title"]', s.meta.socialTitle)
    setMetaContent('meta[name="twitter:description"]', s.meta.socialDescription)

    const structuredData = document.getElementById('structured-data')
    if (structuredData) {
      structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Galaxy · GXLY',
        url: 'https://galaxy-token-web.vercel.app/',
        description: s.meta.description,
        inLanguage: s.htmlLang,
      })
    }

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The language still works for this visit when storage is unavailable.
    }
  }, [language, s])

  function changeLanguage(event: ChangeEvent<HTMLSelectElement>) {
    const nextLanguage = event.target.value === 'zh' ? 'zh' : 'en'
    setLanguage(nextLanguage)
    setNotice(null)
    setTransferErrors({})
  }

  const isBaseConnection = connection.isConnected && connection.chainId === base.id
  const ethBalance = useBalance({
    address: connection.address,
    chainId: base.id,
    query: { enabled: isBaseConnection },
  })
  const gxlyBalance = useReadContract({
    address: TOKEN.address,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [connection.address ?? zeroAddress],
    chainId: base.id,
    query: { enabled: isBaseConnection },
  })
  const connectedAddress = connection.address
  const gxlyBalanceValue = formatGalaxyBalance(gxlyBalance.data)
  const wallet = connection.isConnected && connectedAddress
    ? {
        address: connectedAddress,
        ethBalance: ethBalance.data
          ? formatUnits(ethBalance.data.value, ethBalance.data.decimals)
          : undefined,
        gxlyBalance: gxlyBalanceValue,
      }
    : null

  async function ensureBaseChain(chainId = connection.chainId) {
    if (chainId !== base.id) {
      await switchChain.mutateAsync({ chainId: base.id })
    }
  }

  async function connectWallet(action: 'connect' | 'refresh' = 'connect') {
    setBusyAction(action)
    setNotice({ kind: 'info', text: action === 'refresh' ? s.wallet.notices.refreshing : s.wallet.notices.confirmConnection })

    try {
      if (action === 'connect') {
        if (await openWalletPicker()) {
          setNotice({ kind: 'info', text: s.wallet.notices.chooseWallet })
          return
        }
        const connector = connectors[0]
        if (!connector) {
          throw new Error(s.wallet.notices.noWallet)
        }
        const result = await connect.mutateAsync({ connector })
        await ensureBaseChain(result.chainId)
      } else {
        await ensureBaseChain()
        await Promise.all([ethBalance.refetch(), gxlyBalance.refetch()])
      }
      setNotice({ kind: 'success', text: action === 'refresh' ? s.wallet.notices.refreshed : s.wallet.notices.connected })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: describeWalletError(
          action === 'refresh' ? s.wallet.notices.refreshAction : s.wallet.notices.connectAction,
          error,
          language,
        ),
      })
    } finally {
      setBusyAction(null)
    }
  }

  async function addToWallet() {
    if (!connection.isConnected || !connection.address) {
      setShowManualImport(true)
      setNotice({ kind: 'error', text: s.wallet.notices.connectFirstOrImport })
      return
    }

    setBusyAction('add')
    setNotice({ kind: 'info', text: s.wallet.notices.confirmAdd })

    try {
      await ensureBaseChain()
      const added = await watchAsset.mutateAsync({
        type: 'ERC20',
        options: {
          address: TOKEN.address,
          symbol: TOKEN.symbol,
          decimals: TOKEN.decimals,
          image: new URL('/gxly-logo.png', window.location.origin).href,
        },
        connector: connection.connector,
      })
      setNotice(
        added
          ? { kind: 'success', text: s.wallet.notices.added }
          : { kind: 'info', text: s.wallet.notices.addCancelled },
      )
    } catch (error) {
      setShowManualImport(true)
      const detail = getWalletErrorDetail(error)
      setNotice(
        /not supported on this network/i.test(detail)
          ? { kind: 'info', text: s.wallet.notices.manualImport }
          : {
              kind: 'error',
              text: `${describeWalletError(s.wallet.notices.addAction, error, language)} ${s.wallet.notices.manualImportExpanded}`,
            },
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function disconnectWallet() {
    setBusyAction('disconnect')
    setNotice({ kind: 'info', text: s.wallet.notices.disconnecting })

    try {
      await disconnect.mutateAsync({ connector: connection.connector })
      setRecipient('')
      setTransferAmount('')
      setTransactionHash(null)
      setTransferErrors({})
      setNotice({ kind: 'success', text: s.wallet.notices.disconnected })
    } catch (error) {
      setNotice({ kind: 'error', text: describeWalletError(s.wallet.notices.disconnectAction, error, language) })
    } finally {
      setBusyAction(null)
    }
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!connection.isConnected || !connection.address) {
      setNotice({ kind: 'error', text: s.wallet.notices.connectFirst })
      return
    }

    let transfer
    try {
      transfer = parseGalaxyTransfer(connection.address, recipient, transferAmount)
      setTransferErrors({})
    } catch (error) {
      const rawMessage = getWalletErrorDetail(error)
      const message = localizeWalletError(rawMessage, language)
      const nextErrors = error instanceof GalaxyTransferValidationError && error.field === 'recipient'
        ? { recipient: message }
        : { amount: message }
      setTransferErrors(nextErrors)
      setNotice({ kind: 'error', text: message })
      window.requestAnimationFrame(() => document.getElementById(nextErrors.recipient ? 'recipient' : 'amount')?.focus())
      return
    }

    setBusyAction('send')
    setTransactionHash(null)
    setNotice({ kind: 'info', text: s.wallet.notices.simulating })

    try {
      if (gxlyBalance.data !== undefined && transfer.amount > gxlyBalance.data) {
        throw new Error(language === 'zh' ? 'GXLY 余额不足' : 'Insufficient GXLY balance.')
      }

      await ensureBaseChain()
      const simulation = await simulateContract(wagmiConfig, {
        address: TOKEN.address,
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [transfer.recipient, transfer.amount],
        account: connection.address,
        chainId: base.id,
        connector: connection.connector,
      })
      const hash = await writeContract.mutateAsync(simulation.request)
      setTransactionHash(hash)
      setNotice({ kind: 'info', text: s.wallet.notices.submitted })

      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: base.id })
      await Promise.all([ethBalance.refetch(), gxlyBalance.refetch()])
      setRecipient('')
      setTransferAmount('')
      setTransferErrors({})
      setNotice({ kind: 'success', text: s.wallet.notices.transferSuccess })
    } catch (error) {
      setNotice({ kind: 'error', text: describeWalletError(s.wallet.notices.sendAction, error, language) })
    } finally {
      setBusyAction(null)
    }
  }

  async function copyText(text: string, successText: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice({ kind: 'success', text: successText })
    } catch {
      setNotice({ kind: 'error', text: `${s.wallet.notices.manualCopy}${text}` })
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">{s.skipToContent}</a>
      <header className="site-header">
        <nav className="nav" aria-label={s.mainNavigation}>
          <a className="brand" href="#top" aria-label={s.homeLabel}>
            <img src="/gxly-logo.png" alt="" width="40" height="40" />
            <span>GALAXY</span>
          </a>
          <div className="nav-links">
            <a href="#about">{s.nav.about}</a>
            <a href="#token">{s.nav.token}</a>
            <a href="#wallet">{s.nav.wallet}</a>
            <a href="#status">{s.nav.status}</a>
            <a href="#faq">{s.nav.faq}</a>
          </div>
          <div className="nav-tools">
            <label className="language-picker">
              <span>{s.languageShort}</span>
              <select value={language} onChange={changeLanguage} aria-label={s.languageLabel}>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <span className={`network-pill ${wallet ? 'is-live' : ''}`}>
              <i aria-hidden="true" />{wallet ? s.walletConnected : 'Base · 8453'}
            </span>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <div className="orb orb-one" aria-hidden="true" />
        <div className="orb orb-two" aria-hidden="true" />

      <div className="dashboard" id="top">
        <section className="mission-panel" aria-labelledby="mission-title">
          <div className="mission-copy">
            <span className="eyebrow">{s.hero.eyebrow}</span>
            <h1 id="mission-title">{s.hero.title}<br /><em>{s.hero.emphasis}</em></h1>
            <p>{s.hero.description}</p>
            <div className="hero-actions">
              <a className="primary-link" href="#about">{s.hero.learn}</a>
              <a href={EXPLORER_LINKS.contract} target="_blank" rel="noreferrer">
                {s.hero.verify}<span aria-hidden="true"> ↗</span><span className="visually-hidden">{s.externalNewWindow}</span>
              </a>
            </div>
          </div>

          <div className="orbit-stage" aria-label={s.hero.logoAria}>
            <span className="orbit orbit-a" aria-hidden="true" />
            <span className="orbit orbit-b" aria-hidden="true" />
            <span className="satellite" aria-hidden="true" />
            <img src="/gxly-logo.png" alt={s.hero.logoAria} width="512" height="512" />
          </div>

          <div className="telemetry" aria-label={s.hero.telemetryAria}>
            <div><span>{s.hero.network}</span><strong>BASE MAINNET</strong></div>
            <div><span>{s.hero.supply}</span><strong>20M GXLY</strong></div>
            <div><span>{s.hero.status}</span><strong className="status-live">{s.hero.live}</strong></div>
          </div>
        </section>

        <section className="wallet-console" id="wallet" aria-labelledby="console-title">
          <header className="console-head">
            <div>
              <span className="section-label">{s.wallet.sectionLabel}</span>
              <h2 id="console-title">{s.wallet.title}</h2>
            </div>
            <span className="console-index">GX / 01</span>
          </header>

          {!wallet ? (
            <div className="wallet-empty">
              <div className="signal-mark" aria-hidden="true"><span /><span /><span /></div>
              <h3>{s.wallet.connectHeading}</h3>
              <p>{s.wallet.connectDescription}</p>
              <button className="primary wide" type="button" onClick={() => connectWallet()} disabled={busyAction !== null}>
                {busyAction === 'connect' ? s.wallet.connecting : s.wallet.connect}
              </button>
            </div>
          ) : (
            <div className="wallet-live">
              <div className="account-row">
                <div>
                  <span>{s.wallet.connectedWallet}</span>
                  <strong>{shortAddress(wallet.address)}</strong>
                </div>
                <button type="button" onClick={() => copyText(wallet.address, s.wallet.notices.walletCopied)}>{s.wallet.copy}</button>
              </div>

              <div className="balance-display">
                <span>{s.wallet.balance}</span>
                <strong>{formatBalance(wallet.gxlyBalance, 4, s.locale)}</strong>
                <small>Galaxy on Base</small>
              </div>

              <div className="wallet-metrics">
                <div><span>Base ETH</span><strong>{formatBalance(wallet.ethBalance, 6, s.locale)} ETH</strong></div>
                <div><span>{s.wallet.network}</span><strong>Base Mainnet</strong></div>
              </div>

              <div className="console-actions">
                <button className="primary" type="button" onClick={() => connectWallet('refresh')} disabled={busyAction !== null}>
                  {busyAction === 'refresh' ? s.wallet.refreshing : s.wallet.refresh}
                </button>
                <button className="secondary-button" type="button" onClick={addToWallet} disabled={busyAction !== null}>
                  {busyAction === 'add' ? s.wallet.adding : s.wallet.add}
                </button>
                <button className="secondary-button disconnect-button" type="button" onClick={disconnectWallet} disabled={busyAction !== null}>
                  {busyAction === 'disconnect' ? s.wallet.disconnecting : s.wallet.disconnect}
                </button>
              </div>

              <section className="transfer-module" aria-labelledby="transfer-title">
                <div className="transfer-head">
                  <div>
                    <span className="section-label">{s.wallet.sendLabel}</span>
                    <h3 id="transfer-title">{s.wallet.sendTitle}</h3>
                  </div>
                  <span>BASE MAINNET</span>
                </div>

                <form className="transfer-form" onSubmit={submitTransfer}>
                  <label htmlFor="recipient">{s.wallet.recipient}</label>
                  <input
                    id="recipient"
                    name="recipient"
                    type="text"
                    placeholder="0x…"
                    value={recipient}
                    onChange={(event) => {
                      setRecipient(event.target.value)
                      if (transferErrors.recipient) setTransferErrors((errors) => ({ ...errors, recipient: undefined }))
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busyAction !== null}
                    required
                    aria-invalid={Boolean(transferErrors.recipient)}
                    aria-describedby={transferErrors.recipient ? 'recipient-error' : undefined}
                  />
                  {transferErrors.recipient && <p className="field-error" id="recipient-error" role="alert">{transferErrors.recipient}</p>}

                  <label htmlFor="amount">{s.wallet.amount}</label>
                  <div className="amount-control">
                    <input
                      id="amount"
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      placeholder={s.wallet.amountPlaceholder}
                      value={transferAmount}
                      onChange={(event) => {
                        setTransferAmount(event.target.value)
                        if (transferErrors.amount) setTransferErrors((errors) => ({ ...errors, amount: undefined }))
                      }}
                      autoComplete="off"
                      disabled={busyAction !== null}
                      required
                      aria-invalid={Boolean(transferErrors.amount)}
                      aria-describedby={transferErrors.amount ? 'amount-error' : 'transfer-warning'}
                    />
                    <button
                      type="button"
                      onClick={() => wallet.gxlyBalance && setTransferAmount(wallet.gxlyBalance)}
                      disabled={busyAction !== null || wallet.gxlyBalance === undefined}
                    >MAX</button>
                  </div>
                  {transferErrors.amount && <p className="field-error" id="amount-error" role="alert">{transferErrors.amount}</p>}

                  <p id="transfer-warning">{s.wallet.transferWarning}</p>
                  <button className="transfer-submit" type="submit" disabled={busyAction !== null}>
                    {busyAction === 'send' ? s.wallet.sending : s.wallet.send}
                  </button>
                </form>

                {transactionHash && (
                  <a
                    className="transaction-link"
                    href={`https://basescan.org/tx/${transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >{s.wallet.viewTransaction} <span>↗</span></a>
                )}
              </section>
            </div>
          )}

          <div className="notice-wrap" aria-live="polite" aria-atomic="true">
            {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
          </div>

          <details className="mobile-guide" open={showManualImport} onToggle={(event) => setShowManualImport(event.currentTarget.open)}>
            <summary>{s.wallet.manualSummary}</summary>
            <div className="guide-body">
              <p>{s.wallet.manualDescription}</p>
              <dl>
                <div><dt>{s.wallet.contract}</dt><dd>{shortAddress(TOKEN.address)}</dd></div>
                <div><dt>{s.wallet.symbol}</dt><dd>GXLY</dd></div>
                <div><dt>{s.wallet.decimals}</dt><dd>8</dd></div>
              </dl>
              <button type="button" onClick={() => copyText(TOKEN.address, s.wallet.notices.contractCopied)}>{s.wallet.copyContract}</button>
            </div>
          </details>
        </section>
      </div>

      <section className="token-strip" aria-labelledby="token-title">
        <div className="token-identity">
          <img src="/gxly-logo.png" alt="" width="64" height="64" />
          <div><span className="section-label">TOKEN IDENTITY</span><h2 id="token-title">Galaxy <em>GXLY</em></h2></div>
        </div>
        <div className="contract-block">
          <span>{s.tokenStrip.contract}</span>
          <code title={TOKEN.address}>{TOKEN.address}</code>
        </div>
        <div className="strip-actions">
          <button type="button" onClick={() => copyText(TOKEN.address, s.wallet.notices.contractCopied)}>{s.tokenStrip.copy}</button>
          <a href={EXPLORER_LINKS.token} target="_blank" rel="noreferrer">BaseScan <span aria-hidden="true">↗</span><span className="visually-hidden">{s.externalNewWindow}</span></a>
        </div>
      </section>

      <MarketingSections language={language} copyText={copyText} />

      <footer>
        <p>Galaxy · GXLY on Base Mainnet · Chain ID 8453</p>
        <a href="#top">{s.backToTop}</a>
      </footer>
      </main>
    </>
  )
}
