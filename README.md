# FlexSub - Cross-chain Instant Subscription Protocol

⚡ **Subscribe from any chain. Pay instantly. Settle in USDC.**

FlexSub is a next-generation subscription protocol built for the future of the multi-chain web. By combining **Yellow Network's** instant off-chain payments, **Arc/Circle's** secure USDC settlement, and **LI.FI's** seamless cross-chain bridging, FlexSub provides a frictionless experience for both merchants and subscribers.

---

## 🏆 HackMoney 2026 Submission

FlexSub is submitted for the following prize tracks:

### 🟡 Yellow Network ($15,000) - Instant Micropayments
**Implementation:** Real WebSocket connection to Yellow Network ClearNode (`wss://clearnet-sandbox.yellow.com/ws`) for instant, gas-less off-chain payments via state channels. Merchants can charge subscriptions in real-time or per-use, settling on-chain only when necessary.

**Technical Details:**
- `@erc7824/nitrolite` SDK integration
- Real WebSocket connection to sandbox ClearNode
- State channel management for micropayments
- **Location:** `sdk/src/yellow.ts` | `demo/src/app/unified-demo/page.tsx`

### 🔵 Arc/Circle ($10,000) - USDC Settlement 
**Implementation:** All subscriptions are denominated and settled in USDC on-chain. Real transactions using Circle's official USDC contract on Arbitrum Sepolia.

**Technical Details:**
- Real USDC approve + subscribe transactions
- Smart contract deployed on Arbitrum Sepolia
- **Location:** `contracts/src/FlexSubManager.sol` | `sdk/src/arc.ts`

### 🌉 LI.FI ($6,000) - Cross-Chain Deposits
**Implementation:** Real integration with `@lifi/sdk` for cross-chain quotes. Users can subscribe using any token from any chain, with real-time price quotes from LI.FI's mainnet API.

**Technical Details:**
- Real API calls to LI.FI for cross-chain quotes
- Supports Polygon, Arbitrum, Optimism, and Base
- Displays actual bridge routes and estimated times
- **Location:** `sdk/src/lifi.ts` | `demo/src/app/unified-demo/page.tsx`

---

## 🚀 Live Demo & Deployment

The FlexSub protocol is live on **Arbitrum Sepolia**!

| Component | Address |
|-----------|---------|
| **FlexSubManager** | `0xE5074CBbd046AFb491EB8692abD6cF7ECCC6dEE5` |
| **Official USDC** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

🔗 [View on Arbiscan](https://sepolia.arbiscan.io/address/0xE5074CBbd046AFb491EB8692abD6cF7ECCC6dEE5)

---

## ✨ Demo Features

The unified demo showcases all three integrations:

1. **Direct USDC (Arc)**: Real on-chain USDC transactions
2. **Cross-Chain (LI.FI)**: Real mainnet quotes for any token → USDC swaps
3. **Micropayment (Yellow)**: Real WebSocket connection for instant payments
4. **Subscription Dashboard**: Track all active subscriptions in one view

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

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Quick Start
```bash
# Install dependencies
pnpm install

# Build the SDK and Demo
pnpm build

# Run the local development environment
pnpm dev:all
```

Visit `http://localhost:3000/unified-demo` to explore the **Unified Demo**.

---

## 📁 Project Structure

```
flexsub/
├── contracts/     # Solidity Smart Contracts (Foundry)
│   └── src/FlexSubManager.sol
├── sdk/           # FlexSub TypeScript SDK
│   ├── src/arc.ts     # Arc/Circle integration
│   ├── src/lifi.ts    # LI.FI integration
│   └── src/yellow.ts  # Yellow Network integration
├── docs/          # Architecture & Documentation
└── demo/          # Next.js 14 Web Application
    └── src/app/unified-demo/page.tsx
```

---

## 📄 License

MIT. FlexSub is built by the community for the future of decentralized payments.
