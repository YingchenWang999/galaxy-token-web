import type { Config } from '@wagmi/core'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const configuredRpcUrl = import.meta.env.VITE_BASE_RPC_URL?.trim()
const reownProjectId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim()

function createInjectedConfig() {
  return createConfig({
    chains: [base],
    connectors: [injected()],
    transports: {
      [base.id]: http(configuredRpcUrl || undefined),
    },
  })
}

export let wagmiConfig: Config = createInjectedConfig()

let openAppKitModal: (() => Promise<unknown>) | null = null
let walletKitInitialization: Promise<Config> | null = null
const walletConfigListeners = new Set<(config: Config) => void>()

async function createWalletKit() {
  if (!reownProjectId) return wagmiConfig

  const [{ createAppKit }, { WagmiAdapter }, { base: appKitBase }] = await Promise.all([
    import('@reown/appkit/react'),
    import('@reown/appkit-adapter-wagmi'),
    import('@reown/appkit/networks'),
  ])
  const networks: [typeof appKitBase] = [appKitBase]
  const customRpcUrls = configuredRpcUrl
    ? { 'eip155:8453': [{ url: configuredRpcUrl }] }
    : undefined
  const adapter = new WagmiAdapter({
    networks,
    projectId: reownProjectId,
    customRpcUrls,
  })
  const origin = window.location.origin
  const appKit = createAppKit({
    adapters: [adapter],
    networks,
    defaultNetwork: appKitBase,
    projectId: reownProjectId,
    customRpcUrls,
    metadata: {
      name: 'Galaxy · GXLY',
      description: 'Galaxy (GXLY) token information and wallet tools on Base Mainnet.',
      url: origin,
      icons: [`${origin}/gxly-logo.png`],
    },
    features: {
      analytics: false,
      email: false,
      onramp: false,
      socials: false,
      swaps: false,
    },
  })

  wagmiConfig = adapter.wagmiConfig
  openAppKitModal = () => appKit.open({ view: 'Connect' })
  for (const listener of walletConfigListeners) listener(wagmiConfig)
  return wagmiConfig
}

function initializeWalletKit() {
  walletKitInitialization ??= createWalletKit().catch((error) => {
    walletKitInitialization = null
    throw error
  })
  return walletKitInitialization
}

export async function openWalletPicker() {
  if (!reownProjectId) return false
  await initializeWalletKit()
  if (!openAppKitModal) return false
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  await openAppKitModal()
  return true
}

export function subscribeWalletConfig(listener: (config: Config) => void) {
  walletConfigListeners.add(listener)
  return () => {
    walletConfigListeners.delete(listener)
  }
}

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
