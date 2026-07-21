import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { App } from './App'
import { subscribeWalletConfig, wagmiConfig } from './wagmi'
import './styles.css'

const queryClient = new QueryClient()

function WalletRoot() {
  const [walletState, setWalletState] = useState({ config: wagmiConfig, generation: 0 })

  useEffect(() => {
    return subscribeWalletConfig((config) => {
      setWalletState((current) => (
        current.config === config
          ? current
          : { config, generation: current.generation + 1 }
      ))
    })
  }, [])

  return (
    <WagmiProvider key={walletState.generation} config={walletState.config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletRoot />
  </StrictMode>,
)
