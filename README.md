# Galaxy Token Web

Galaxy (GXLY) 的 Base 主网介绍官网与持币人工具，使用 React、TypeScript、Vite 和 pnpm 构建。

钱包与链上交互使用：

- Reown AppKit：浏览器钱包选择、WalletConnect 二维码和手机钱包连接
- Wagmi：钱包连接、切链、查询缓存和交易状态管理
- Viem：Base 链配置、ERC-20 ABI、地址/数量校验及合约调用
- TanStack Query：为 Wagmi 提供异步查询和缓存层

配置 Reown Project ID 后，连接入口会使用 AppKit，覆盖浏览器注入钱包、WalletConnect 和 Coinbase Wallet。未配置时，本地开发会安全降级到标准 injected 连接器。

## 代币信息

- 网络：Base Mainnet（Chain ID 8453）
- 合约：`0x405a51da0717c1671f90a48c48672b41E22e072e`
- BaseScan：<https://basescan.org/address/0x405a51da0717c1671f90a48c48672b41E22e072e>
- 符号：GXLY
- 精度：8
- 总供应量：20,000,000 GXLY

## 本地运行

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 Reown Dashboard 创建 AppKit 项目，并在 `.env.local` 或部署平台中配置：

```bash
VITE_BASE_RPC_URL=https://你的专用-Base-Mainnet-RPC
VITE_REOWN_PROJECT_ID=你的-Reown-Project-ID
```

Base 公共 RPC 只用于未配置环境变量时的本地降级，不适合正式流量。`pnpm build` 会检查以上两项，缺失、仍是占位符、使用 HTTP 或直接使用 `mainnet.base.org` 时会拒绝生产构建；仅验证本地代码可运行时使用 `pnpm build:local`。

这些 `VITE_` 变量会被打包到浏览器：RPC 服务商后台应限制允许域名、网络和额度。这里不能存放钱包私钥、助记词或其他真正的秘密。

页面支持：

- 展示经合约源码核对的固定供应、权限边界、主网上线状态与验证入口
- 提供响应式介绍、代币数据、进度、风险提示和 FAQ
- 连接 EVM 钱包并切换到 Base Mainnet
- 使用 WalletConnect 二维码连接欧易、MetaMask 等手机钱包
- 读取 Base ETH 和 GXLY 余额
- 将 GXLY 添加到钱包
- 模拟 ERC-20 转账、请求钱包签名并等待主网回执

可在 `.env.local` 中填写已经验证的官方 X、Telegram、Discord 或 GitHub 地址；未填写的渠道不会在页面中显示。不要为了占位发布未经确认的社交链接。

## 构建

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

`pnpm check` 会同时检查 `src`、`test` 与 Vite 配置，避免只在编辑器中出现而命令行遗漏的 TypeScript 错误。

Vercel 已关联项目可使用下面的只读命令确认生产变量是否存在：

```bash
pnpm exec vercel env ls production
```

正式构建前，请先在 Reown Dashboard 把 `https://galaxy-token-web.vercel.app` 加入允许域名，并在 RPC 服务商后台配置相同的域名限制。

部署后，Logo 的 HTTPS 地址是：`https://你的域名/gxly-logo.png`。
