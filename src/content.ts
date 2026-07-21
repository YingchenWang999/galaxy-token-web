import { TOKEN } from './wallet'

export const DEPLOYMENT_TX =
  '0x54798b4388746518e2e43c4d9448a711279af4f8478b2d0befb7b58b2f0de3ea'
export const INITIAL_HOLDER = '0x328aa52F87f8b1571d03Ff64b42B85Fbcf3Dc77E'

export const PROJECT_CONTACT = {
  name: 'YingchenWang999',
  email: 'aomgyingchen@gmail.com',
  profile: 'https://github.com/YingchenWang999',
} as const

export const EXPLORER_LINKS = {
  token: `https://basescan.org/token/${TOKEN.address}`,
  contract: `https://basescan.org/address/${TOKEN.address}#code`,
  deployment: `https://basescan.org/tx/${DEPLOYMENT_TX}`,
  blockscout: `https://base.blockscout.com/address/${TOKEN.address}`,
} as const

export const OFFICIAL_CHANNELS = [
  { label: 'X', url: import.meta.env.VITE_X_URL },
  { label: 'Telegram', url: import.meta.env.VITE_TELEGRAM_URL },
  { label: 'Discord', url: import.meta.env.VITE_DISCORD_URL },
  {
    label: 'GitHub',
    url: import.meta.env.VITE_GITHUB_URL || 'https://github.com/YingchenWang999/galaxy-token',
  },
].filter((channel): channel is { label: string; url: string } => Boolean(channel.url))
