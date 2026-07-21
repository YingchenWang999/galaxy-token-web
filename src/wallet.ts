import {
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  zeroAddress,
  type Address,
} from 'viem'

export const TOKEN = {
  address: '0x405a51da0717c1671f90a48c48672b41E22e072e' as Address,
  symbol: 'GXLY',
  decimals: 8,
  supply: '20,000,000',
} as const

export const TOKEN_ABI = erc20Abi

export type GalaxyTransfer = {
  recipient: Address
  amount: bigint
}

export class GalaxyTransferValidationError extends Error {
  readonly field: 'recipient' | 'amount'

  constructor(
    field: 'recipient' | 'amount',
    message: string,
  ) {
    super(message)
    this.name = 'GalaxyTransferValidationError'
    this.field = field
  }
}

export function parseGalaxyTransfer(
  sender: Address,
  recipientValue: string,
  amountValue: string,
): GalaxyTransfer {
  const normalizedRecipient = recipientValue.trim()
  if (!isAddress(normalizedRecipient, { strict: false })) {
    throw new GalaxyTransferValidationError('recipient', '接收地址格式不正确')
  }

  const recipient = getAddress(normalizedRecipient.toLowerCase())
  if (recipient === zeroAddress) {
    throw new GalaxyTransferValidationError('recipient', '接收地址不能是零地址')
  }
  if (sender.toLowerCase() === recipient.toLowerCase()) {
    throw new GalaxyTransferValidationError('recipient', '接收地址不能与当前钱包相同')
  }

  const normalizedAmount = amountValue.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalizedAmount)) {
    throw new GalaxyTransferValidationError('amount', '请输入正确的 GXLY 数量')
  }

  const fraction = normalizedAmount.split('.')[1] ?? ''
  if (fraction.length > TOKEN.decimals) {
    throw new GalaxyTransferValidationError('amount', `GXLY 最多支持 ${TOKEN.decimals} 位小数`)
  }

  const amount = parseUnits(normalizedAmount, TOKEN.decimals)
  if (amount <= 0n) throw new GalaxyTransferValidationError('amount', '发送数量必须大于 0')

  return { recipient, amount }
}

export function formatGalaxyBalance(value: bigint | undefined) {
  return value === undefined ? undefined : formatUnits(value, TOKEN.decimals)
}

export function getWalletErrorDetail(error: unknown): string {
  const visited = new Set<unknown>()
  let current = error
  let fallbackMessage = ''

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current)
    const candidate = current as {
      shortMessage?: unknown
      details?: unknown
      message?: unknown
      cause?: unknown
    }

    if (typeof candidate.shortMessage === 'string' && candidate.shortMessage) return candidate.shortMessage
    if (typeof candidate.details === 'string' && candidate.details) return candidate.details
    if (!fallbackMessage && typeof candidate.message === 'string') fallbackMessage = candidate.message
    current = candidate.cause
  }

  return fallbackMessage || '钱包未返回详细原因'
}

export function isUserRejectedRequest(error: unknown) {
  const visited = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current)
    const candidate = current as { code?: number | string; message?: unknown; shortMessage?: unknown; cause?: unknown }
    if (candidate.code === 4001 || candidate.code === '4001') return true
    const message = [candidate.shortMessage, candidate.message]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
    if (/user (?:rejected|denied)|request rejected/i.test(message)) return true
    current = candidate.cause
  }
  return false
}
