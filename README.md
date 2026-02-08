# FlexSub - Cross-chain Instant Subscription Protocol

⚡ **Subscribe from any chain. Pay instantly. Settle in USDC.**

FlexSub is a next-generation subscription protocol built for the multi-chain web. By combining **Yellow Network's** instant off-chain payments, **Arc/Circle's** secure USDC settlement, and **LI.FI's** seamless cross-chain bridging, FlexSub provides a frictionless experience for both merchants and subscribers.

---

## 💡 Vision

### The Problem

Today's Web3 subscription experience is broken:

- **Chain Fragmentation**: Users have assets scattered across multiple chains. Subscribing to a service shouldn't require manual bridging and swapping.
- **Gas Fee Overhead**: Every subscription payment incurs gas fees, making micropayments and frequent billing impractical.
- **Stablecoin Friction**: Merchants want to receive USDC for predictable revenue, but users hold various tokens.

### Our Solution

FlexSub reimagines subscriptions for the multi-chain era:

1. **Pay from Anywhere**: Subscribe using any token from any chain. LI.FI handles the bridge and swap automatically.
2. **Instant & Gas-less**: Yellow Network's state channels enable real-time micropayments without gas fees per transaction.
3. **Stable Settlement**: All payments settle in USDC via Circle, giving merchants predictable, stable revenue.

### Why This Matters

We believe subscriptions are the backbone of the creator economy. By removing blockchain complexity, FlexSub enables:

- **Creators** to monetize globally without payment processor restrictions
- **Users** to subscribe with whatever assets they have, wherever they are
- **Developers** to integrate flexible billing with a simple SDK

---

## 🛠️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FlexSub Protocol                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Yellow    │  │  Arc/Circle │  │       LI.FI         │  │
│  │  Network    │  │    USDC     │  │   Cross-Chain       │  │
│  │             │  │             │  │                     │  │
│  │ WebSocket   │  │ On-chain    │  │ Multi-chain         │  │
│  │ State       │  │ Settlement  │  │ Bridge + Swap       │  │
│  │ Channels    │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│              ┌───────────▼───────────┐                      │
│              │  FlexSubManager.sol   │                      │
│              │  (Arbitrum Sepolia)   │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integrations

### Yellow Network - Instant Micropayments
Real WebSocket connection to Yellow Network ClearNode (`wss://clearnet-sandbox.yellow.com/ws`) for instant, gas-less off-chain payments via state channels.

- `@erc7824/nitrolite` SDK integration
- State channel management for micropayments
- **Location:** `sdk/src/yellow.ts`

### Arc/Circle - USDC Settlement 
All subscriptions are denominated and settled in USDC on-chain using Circle's official USDC contract.

- Real USDC approve + subscribe transactions
- Smart contract deployed on Arbitrum Sepolia
- **Location:** `contracts/src/FlexSubManager.sol` | `sdk/src/arc.ts`

### LI.FI - Cross-Chain Deposits
Real integration with `@lifi/sdk` for cross-chain quotes. Users can subscribe using any token from any chain.

- Supports Polygon, Arbitrum, Optimism, and Base
- Displays actual bridge routes and estimated times
- **Location:** `sdk/src/lifi.ts`

---

## 🚀 Deployment

| Component | Address |
|-----------|---------|
| **FlexSubManager** | `0xE5074CBbd046AFb491EB8692abD6cF7ECCC6dEE5` |
| **USDC (Circle)** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

🔗 [View on Arbiscan](https://sepolia.arbiscan.io/address/0xE5074CBbd046AFb491EB8692abD6cF7ECCC6dEE5)

---

## 🏃 Getting Started

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run development environment
pnpm dev:all
```

Visit `http://localhost:3000/unified-demo`

---

## 📁 Project Structure

```
flexsub/
├── contracts/     # Solidity Smart Contracts (Foundry)
├── sdk/           # TypeScript SDK (Arc, LI.FI, Yellow)
├── demo/          # Next.js 14 Web Application
└── docs/          # Documentation
```

---

## 📄 License

MIT
