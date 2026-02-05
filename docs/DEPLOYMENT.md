# FlexSub Testnet Deployment Guide

## ⚠️ Prerequisites

### 1. Get Testnet ETH

You need testnet ETH for gas fees:

| Network | Faucet |
|---------|--------|
| Arbitrum Sepolia | https://faucet.quicknode.com/arbitrum/sepolia |
| Base Sepolia | https://faucet.circle.com/ |

### 2. Set Environment Variables

Create a `.env` file in the `contracts/` folder:

```bash
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification on block explorers
ARBISCAN_API_KEY=your_arbiscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

> ⚠️ **NEVER commit your private key to git!**

---

## 🚀 Deployment Commands

### Deploy to Arbitrum Sepolia (Recommended)

```bash
cd contracts

# Load environment variables
source .env

# Deploy
forge script script/Deploy.s.sol:DeployFlexSub \
  --rpc-url arbitrum-sepolia \
  --broadcast \
  --verify
```

### Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol:DeployFlexSub \
  --rpc-url base-sepolia \
  --broadcast \
  --verify
```

---

## 📋 After Deployment

1. **Copy the contract address** from the deployment output

2. **Update `demo/src/app/deployments.json`**:

```json
{
  "31337": { ... },
  "421614": {
    "name": "Arbitrum Sepolia",
    "contractAddress": "0x_YOUR_DEPLOYED_ADDRESS",
    "usdcAddress": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    "timestamp": "2026-02-05T00:00:00Z"
  }
}
```

3. **Get Testnet USDC**
   - Faucet: https://faucet.circle.com/
   - Select Arbitrum Sepolia or Base Sepolia
   - Request USDC to your wallet

4. **Test the deployment**
   - Run `pnpm dev` in the demo folder
   - Connect wallet to Arbitrum Sepolia
   - Try subscribing with testnet USDC

---

## 🔍 Verify Contract on Block Explorer

If verification didn't happen automatically:

```bash
forge verify-contract \
  --chain-id 421614 \
  --watch \
  YOUR_CONTRACT_ADDRESS \
  src/FlexSubManager.sol:FlexSubManager \
  --constructor-args $(cast abi-encode "constructor(address)" 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
```

---

## 📊 Network Details

| Network | Chain ID | USDC Address | Block Explorer |
|---------|----------|--------------|----------------|
| Arbitrum Sepolia | 421614 | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | https://sepolia.arbiscan.io |
| Base Sepolia | 84532 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | https://sepolia.basescan.org |
| Arbitrum One | 42161 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | https://arbiscan.io |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | https://basescan.org |

---

## 🔄 Quick Deploy Script

For convenience, run this one-liner:

```bash
# Arbitrum Sepolia
cd contracts && source .env && forge script script/Deploy.s.sol:DeployFlexSub --rpc-url arbitrum-sepolia --broadcast

# Base Sepolia  
cd contracts && source .env && forge script script/Deploy.s.sol:DeployFlexSub --rpc-url base-sepolia --broadcast
```

---

## ❓ Troubleshooting

### "Insufficient funds"
- Get more testnet ETH from faucets

### "USDC transfer failed"
- Get testnet USDC from https://faucet.circle.com/
- Make sure you approved the contract to spend USDC

### "RPC error"
- Try a different RPC URL
- Check if the network is congested
