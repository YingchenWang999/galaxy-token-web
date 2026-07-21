import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const siteUrl = 'https://galaxy-token-web.vercel.app/'

test('publishes complete canonical and social metadata', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}"`))
  assert.match(html, /property="og:image" content="https:\/\/galaxy-token-web\.vercel\.app\/og-gxly\.png"/)
  assert.match(html, /name="twitter:card" content="summary_large_image"/)
  assert.match(html, /type="application\/ld\+json"/)
})

test('publishes valid discovery files', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'),
  ) as { name: string; icons: Array<{ sizes: string }> }
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')

  assert.equal(manifest.name, 'Galaxy · GXLY')
  assert.equal(manifest.icons[0]?.sizes, '512x512')
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl}sitemap\\.xml`))
  assert.match(sitemap, new RegExp(`<loc>${siteUrl}</loc>`))
})

test('uses a 1200 by 630 social card', () => {
  const image = readFileSync(new URL('../public/og-gxly.png', import.meta.url))

  assert.equal(image.toString('ascii', 1, 4), 'PNG')
  assert.equal(image.readUInt32BE(16), 1200)
  assert.equal(image.readUInt32BE(20), 630)
})

test('documents and enforces production wallet infrastructure', () => {
  const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> }
  const productionCheck = readFileSync(
    new URL('../scripts/check-production-env.mjs', import.meta.url),
    'utf8',
  )

  assert.match(envExample, /VITE_BASE_RPC_URL=/)
  assert.match(envExample, /VITE_REOWN_PROJECT_ID=/)
  assert.match(packageJson.scripts.build, /check-production-env/)
  assert.match(productionCheck, /mainnet\.base\.org/)
})

test('publishes safe Vercel headers and immutable asset caching', () => {
  const config = JSON.parse(
    readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
  ) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }

  const allHeaders = config.headers.flatMap((entry) => entry.headers)
  assert.ok(allHeaders.some((header) => header.key === 'X-Content-Type-Options' && header.value === 'nosniff'))
  assert.ok(allHeaders.some((header) => header.key === 'X-Frame-Options' && header.value === 'DENY'))
  assert.ok(allHeaders.some((header) => header.key === 'Referrer-Policy'))
  assert.ok(allHeaders.some((header) => header.key === 'Permissions-Policy'))
  assert.ok(config.headers.some((entry) => entry.source === '/assets/(.*)'
    && entry.headers.some((header) => /immutable/.test(header.value))))
})
