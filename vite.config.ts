import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // AppKit is loaded only after the user asks to connect a wallet.
    chunkSizeWarningLimit: 600,
  },
})
