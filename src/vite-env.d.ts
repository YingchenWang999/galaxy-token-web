/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_RPC_URL?: string
  readonly VITE_REOWN_PROJECT_ID?: string
  readonly VITE_X_URL?: string
  readonly VITE_TELEGRAM_URL?: string
  readonly VITE_DISCORD_URL?: string
  readonly VITE_GITHUB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
