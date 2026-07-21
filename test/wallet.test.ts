import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatGalaxyBalance,
  GalaxyTransferValidationError,
  getWalletErrorDetail,
  isUserRejectedRequest,
  parseGalaxyTransfer,
  TOKEN,
} from '../src/wallet.ts'

const sender = '0x10AB417e25Fa1E0335E7E322958AB919383B9a38'

test('parses a GXLY transfer with the token precision', () => {
  const transfer = parseGalaxyTransfer(
    sender,
    ' 0x1111111111111111111111111111111111111111 ',
    '10.5',
  )

  assert.deepEqual(transfer, {
    recipient: '0x1111111111111111111111111111111111111111',
    amount: 1_050_000_000n,
  })
})

test('rejects invalid, self, zero, and over-precision transfers', () => {
  assert.throws(() => parseGalaxyTransfer(sender, 'not-an-address', '1'), /接收地址格式不正确/)
  assert.throws(
    () => parseGalaxyTransfer(sender, '0x0000000000000000000000000000000000000000', '1'),
    (error: unknown) => error instanceof GalaxyTransferValidationError
      && error.field === 'recipient'
      && /零地址/.test(error.message),
  )
  assert.throws(() => parseGalaxyTransfer(sender, sender, '1'), /接收地址不能与当前钱包相同/)
  assert.throws(
    () => parseGalaxyTransfer(sender, '0x1111111111111111111111111111111111111111', '0'),
    /发送数量必须大于 0/,
  )
  assert.throws(
    () => parseGalaxyTransfer(sender, '0x1111111111111111111111111111111111111111', '1.123456789'),
    new RegExp(`GXLY 最多支持 ${TOKEN.decimals} 位小数`),
  )
})

test('formats the onchain bigint balance using GXLY decimals', () => {
  assert.equal(formatGalaxyBalance(800_000_000_000_000n), '8000000')
  assert.equal(formatGalaxyBalance(1_050_000_000n), '10.5')
  assert.equal(formatGalaxyBalance(undefined), undefined)
})

test('extracts Wagmi-style error details and detects nested user rejection', () => {
  const rejection = Object.assign(new Error('request failed'), {
    shortMessage: 'User rejected the request.',
    cause: { code: 4001 },
  })

  assert.equal(getWalletErrorDetail(rejection), 'User rejected the request.')
  assert.equal(isUserRejectedRequest(rejection), true)
  assert.equal(getWalletErrorDetail({ shortMessage: 'RPC unavailable' }), 'RPC unavailable')
  assert.equal(isUserRejectedRequest({ code: '4001' }), true)
  assert.equal(isUserRejectedRequest({ message: 'User denied transaction signature' }), true)
  assert.equal(isUserRejectedRequest(new Error('RPC unavailable')), false)

  const circular: { message: string; cause?: unknown } = { message: 'Circular error' }
  circular.cause = circular
  assert.equal(getWalletErrorDetail(circular), 'Circular error')
  assert.equal(isUserRejectedRequest(circular), false)
})
