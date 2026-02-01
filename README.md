# FlexSub - Cross-chain Instant Subscription Protocol

⚡ Subscribe from any chain. Pay instantly. Settle in USDC.

## 🏆 HackMoney 2026 Submission

Built for:
- **Yellow Network** - Instant micropayments via state channels
- **Arc/Circle** - USDC settlement
- **LI.FI** - Cross-chain deposits

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start local dev (Anvil + Deploy + Demo)
pnpm dev:all

# Visit http://localhost:3000
```

## 📁 Project Structure

```
flexsub/
├── contracts/     # Solidity smart contracts (Foundry)
├── sdk/           # TypeScript SDK
└── demo/          # Next.js demo app
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:all` | Start Anvil + Deploy + Demo |
| `pnpm dev` | Demo only |
| `pnpm build` | Build SDK + Demo |
| `pnpm build:contracts` | Compile contracts |
| `pnpm test:contracts` | Run contract tests |
| `pnpm lint` | Run linting |

## 🧪 Testing with MetaMask

1. Add Anvil network: RPC `http://127.0.0.1:8545`, Chain ID `31337`
2. Import test account:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

## 📄 License

MIT
