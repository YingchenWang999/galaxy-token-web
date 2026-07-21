import assert from 'node:assert/strict'
import test from 'node:test'
import {
  localizeWalletError,
  resolveInitialLanguage,
  UI_COPY,
} from '../src/i18n.ts'

test('prefers a saved language and otherwise follows the browser language', () => {
  assert.equal(resolveInitialLanguage('en', 'zh-CN'), 'en')
  assert.equal(resolveInitialLanguage('zh', 'en-US'), 'zh')
  assert.equal(resolveInitialLanguage(null, 'zh-HK'), 'zh')
  assert.equal(resolveInitialLanguage(null, 'fr-FR'), 'en')
})

test('publishes complete Chinese and English page copy', () => {
  assert.equal(UI_COPY.zh.marketing.facts.length, 3)
  assert.equal(UI_COPY.en.marketing.facts.length, 3)
  assert.equal(UI_COPY.zh.marketing.milestones.length, 4)
  assert.equal(UI_COPY.en.marketing.milestones.length, 4)
  assert.equal(UI_COPY.zh.marketing.faqs.length, 5)
  assert.equal(UI_COPY.en.marketing.faqs.length, 5)
  assert.match(UI_COPY.en.hero.description, /Galactic Federation/)
})

test('localizes known transfer validation errors', () => {
  assert.equal(
    localizeWalletError('接收地址格式不正确', 'en'),
    'The recipient address is invalid.',
  )
  assert.equal(
    localizeWalletError('GXLY 最多支持 8 位小数', 'en'),
    'GXLY supports up to 8 decimal places.',
  )
  assert.equal(
    localizeWalletError('接收地址不能是零地址', 'en'),
    'The recipient address cannot be the zero address.',
  )
  assert.equal(UI_COPY.zh.wallet.disconnect, '断开钱包')
  assert.equal(UI_COPY.en.wallet.disconnect, 'Disconnect wallet')
})
