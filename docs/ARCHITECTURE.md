# FlexSub Architecture

## System Overview

```mermaid
flowchart TB
    subgraph User["👤 User"]
        Wallet["MetaMask / Rainbow"]
    end

    subgraph Frontend["🌐 FlexSub Demo (Next.js)"]
        UI["Subscription UI"]
        SDK["FlexSub SDK"]
    end

    subgraph PaymentMethods["💳 Payment Methods"]
        Arc["Arc (Direct USDC)"]
        LiFi["LI.FI (Cross-Chain)"]
        Yellow["Yellow Network (Micropayments)"]
    end

    subgraph Blockchain["⛓️ Blockchain Layer"]
        FlexSub["FlexSubManager.sol"]
        USDC["USDC Token"]
    end

    subgraph External["🔗 External Protocols"]
        LiFiAPI["LI.FI API"]
        YellowState["Yellow State Channels"]
        CircleGateway["Circle Gateway"]
    end

    Wallet --> UI
    UI --> SDK
    
    SDK --> Arc
    SDK --> LiFi
    SDK --> Yellow
    
    Arc --> USDC
    Arc --> FlexSub
    
    LiFi --> LiFiAPI
    LiFiAPI --> USDC
    LiFiAPI --> FlexSub
    
    Yellow --> YellowState
    YellowState --> USDC
    YellowState --> FlexSub
    
    USDC --> CircleGateway
```

## Payment Flow Details

### 1. Direct USDC Payment (Arc)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wallet
    participant SDK as FlexSub SDK
    participant USDC as USDC Token
    participant FS as FlexSubManager

    U->>W: Select Plan & Payment
    W->>SDK: Initiate Arc Payment
    SDK->>USDC: approve(FlexSub, amount)
    USDC-->>SDK: Approved
    SDK->>FS: subscribe(planId)
    FS->>USDC: transferFrom(user, merchant)
    FS-->>SDK: subscriptionId
    SDK-->>U: ✅ Subscription Active
```

### 2. Cross-Chain Payment (LI.FI)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wallet
    participant SDK as FlexSub SDK
    participant LiFi as LI.FI API
    participant Bridge as Bridge/DEX
    participant FS as FlexSubManager

    U->>W: Select Plan (from any chain)
    W->>SDK: Initiate Cross-Chain
    SDK->>LiFi: getQuote(srcChain, destChain)
    LiFi-->>SDK: Quote + Route
    SDK->>W: Sign Transaction
    W->>Bridge: Execute Swap+Bridge
    Bridge->>FS: subscribe(planId) [destination chain]
    FS-->>SDK: subscriptionId
    SDK-->>U: ✅ Subscription Active
```

### 3. Micropayment (Yellow Network)

```mermaid
sequenceDiagram
    participant U as User
    participant SDK as FlexSub SDK
    participant Yellow as Yellow State Channel
    participant FS as FlexSubManager

    U->>SDK: Open Payment Session
    SDK->>Yellow: openChannel(deposit)
    Yellow-->>SDK: channelId

    loop Pay-per-Use
        U->>SDK: API Call
        SDK->>Yellow: signPayment(amount)
        Yellow-->>SDK: Updated Balance
    end

    U->>SDK: Close Session
    SDK->>Yellow: closeChannel()
    Yellow->>FS: settleOnChain(totalSpent)
    FS-->>U: ✅ Final Receipt
```

## Smart Contract Architecture

```mermaid
classDiagram
    class FlexSubManager {
        +mapping subscriptions
        +mapping plans
        +subscribe(planId) subscriptionId
        +cancel(subscriptionId)
        +isActive(subscriptionId) bool
        +getPlan(planId) Plan
    }

    class USDC {
        +approve(spender, amount)
        +transferFrom(from, to, amount)
        +balanceOf(account) uint256
    }

    class LiFiIntegration {
        +getQuote(src, dest, amount)
        +executeBridge(quote)
    }

    class YellowChannel {
        +openChannel(deposit)
        +signPayment(amount)
        +closeChannel()
        +settleOnChain()
    }

    FlexSubManager --> USDC : uses
    FlexSubManager <-- LiFiIntegration : calls
    FlexSubManager <-- YellowChannel : settles
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, RainbowKit |
| SDK | TypeScript, Viem, Wagmi |
| Smart Contracts | Solidity, Foundry |
| Protocols | Arc/USDC, LI.FI, Yellow Network |
| Testing | Anvil (local), Foundry Tests |

## Deployment Targets

| Network | Status | Contract Address |
|---------|--------|------------------|
| Anvil Local | ✅ Deployed | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Polygon Mumbai | 🔄 Pending | - |
| Arbitrum Sepolia | 🔄 Pending | - |
