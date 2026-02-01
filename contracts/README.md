# FlexSub Contracts

Solidity smart contracts for FlexSub subscription protocol.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Setup

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test
```

## Deploy

### Environment Setup

Create a `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
ARBISCAN_API_KEY=your_arbiscan_api_key  # For verification
```

### Deploy to Testnet (Arbitrum Sepolia)

```bash
# Load env
source .env

# Deploy
forge script script/Deploy.s.sol:DeployFlexSub \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --broadcast \
  --verify

# Or use shorthand
forge script script/Deploy.s.sol:DeployFlexSub --rpc-url arb-sepolia --broadcast
```

### Deploy to Mainnet (Arbitrum One)

```bash
forge script script/Deploy.s.sol:DeployFlexSub \
  --rpc-url https://arb1.arbitrum.io/rpc \
  --broadcast \
  --verify
```

## Contract Addresses

| Network | FlexSubManager | USDC |
|---------|---------------|------|
| Arbitrum Sepolia | `TBD` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Arbitrum One | `TBD` | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

## Usage

```solidity
// Create a subscription plan
flexsub.createPlan(
    9990000,    // 9.99 USDC (6 decimals)
    2592000,    // 30 days in seconds
    "Pro Plan"
);

// Subscribe to a plan
flexsub.subscribe(planId);

// Charge a subscription (merchant only)
flexsub.charge(subscriptionId, 990000); // 0.99 USDC
```
