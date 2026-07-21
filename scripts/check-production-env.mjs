import process from 'node:process'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), '')
const rpcUrl = env.VITE_BASE_RPC_URL?.trim()
const projectId = env.VITE_REOWN_PROJECT_ID?.trim()
const errors = []

if (!rpcUrl) {
  errors.push('缺少 VITE_BASE_RPC_URL（生产环境必须使用专用 Base RPC）')
} else {
  try {
    const url = new URL(rpcUrl)
    if (url.protocol !== 'https:') errors.push('VITE_BASE_RPC_URL 必须使用 HTTPS')
    if (url.hostname === 'mainnet.base.org') errors.push('Base 公共 RPC 有速率限制，不能作为生产 RPC')
    if (/your-|example/i.test(rpcUrl)) errors.push('VITE_BASE_RPC_URL 仍是示例占位符')
  } catch {
    errors.push('VITE_BASE_RPC_URL 不是有效 URL')
  }
}

if (!projectId) {
  errors.push('缺少 VITE_REOWN_PROJECT_ID（WalletConnect/AppKit 无法启用）')
} else if (/your-|example|project.?id/i.test(projectId) || projectId.length < 16) {
  errors.push('VITE_REOWN_PROJECT_ID 看起来仍是示例占位符')
}

if (errors.length > 0) {
  console.error('生产环境配置检查失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('生产环境配置检查通过：专用 Base RPC 与 Reown Project ID 已配置。')
