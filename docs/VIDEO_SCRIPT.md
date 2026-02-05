# FlexSub Demo Video Script

## Overview
- **Duration**: 2:30 - 3:00 minutes
- **Target**: HackMoney 2026 judges (Yellow, Arc, LI.FI)
- **Language**: English (recommended for international judges)

---

## 🎬 Video Timeline

### 0:00 - 0:15 | Opening Hook ⚡

**[SCREEN: FlexSub landing page]**

> "What if you could subscribe to any Web3 service, from any chain, 
> with any token, and settle instantly?"
>
> "Introducing FlexSub - the cross-chain instant subscription protocol."

**Action**: Show the landing page briefly

---

### 0:15 - 0:35 | Problem Statement 🎯

**[SCREEN: Slide or text overlay]**

> "Today's subscription payments in Web3 have three major problems:
>
> First - they're chain-locked. Users must have the right token on the right chain.
>
> Second - they're slow. On-chain payments mean gas costs and wait times.
>
> Third - they're inflexible. No pay-per-use, no micropayments.
>
> FlexSub solves all three."

---

### 0:35 - 1:10 | Demo: Direct USDC Payment (Arc) 💳

**[SCREEN: Unified Demo page - http://localhost:3000/unified-demo]**

> "Let me show you. Here's our unified demo."
>
> "First, the Arc integration for direct USDC payments."

**Actions**:
1. Connect wallet
2. Select a subscription plan (Pro - $9.99)
3. Choose "Direct USDC" payment method
4. Click "Continue to Payment"
5. Show approval transaction
6. Show subscribe transaction
7. Show success screen

> "In just two transactions, the user is subscribed. 
> The merchant receives USDC instantly via Circle's Arc infrastructure."

---

### 1:10 - 1:45 | Demo: Cross-Chain Payment (LI.FI) 🔗

**[SCREEN: Stay on Unified Demo]**

> "But what if the user's funds are on a different chain?"
>
> "With LI.FI integration, users can pay from ANY EVM chain."

**Actions**:
1. Click "Start New Demo"
2. Select Enterprise plan
3. Choose "Cross-Chain" payment method
4. Show source chain selector (Polygon, Arbitrum, Optimism, Base)
5. Select Polygon
6. Show the quote fetching
7. Execute the cross-chain swap + subscribe

> "LI.FI handles the swap, the bridge, and the final subscription 
> in a single seamless flow. The user never leaves the app."

---

### 1:45 - 2:15 | Demo: Micropayments (Yellow Network) ⚡

**[SCREEN: Stay on Unified Demo]**

> "Now here's the game-changer: Yellow Network micropayments."

**Actions**:
1. Click "Start New Demo"
2. Select Starter plan
3. Choose "Micropayment" method
4. Show the session opening
5. Demonstrate instant off-chain payments (multiple clicks)
6. Show the running balance update
7. Close session and show on-chain settlement

> "With Yellow's state channel technology, users can make 
> THOUSANDS of micropayments off-chain, with ZERO gas fees.
>
> Only the final settlement goes on-chain. 
> Perfect for pay-per-use APIs, streaming payments, or real-time services."

---

### 2:15 - 2:30 | Architecture & Tech Stack 🏗️

**[SCREEN: Architecture diagram]**

> "Under the hood, FlexSub combines three cutting-edge protocols:
>
> Arc for stable USDC settlement
> LI.FI for cross-chain liquidity
> Yellow Network for instant off-chain payments
>
> All unified in a single SDK and smart contract."

---

### 2:30 - 2:45 | Closing ✨

**[SCREEN: FlexSub logo + Contact info]**

> "FlexSub - Subscribe from any chain. Pay instantly. Settle in USDC.
>
> Built for HackMoney 2026.
> Check out our GitHub for the full source code.
>
> Thank you for watching!"

---

## 🎤 Full Narration Script (Copy for AI Voice)

```
What if you could subscribe to any Web3 service, from any chain, with any token, and settle instantly? Introducing FlexSub - the cross-chain instant subscription protocol.

Today's subscription payments in Web3 have three major problems. First, they're chain-locked. Users must have the right token on the right chain. Second, they're slow. On-chain payments mean gas costs and wait times. Third, they're inflexible. No pay-per-use, no micropayments. FlexSub solves all three.

Let me show you. Here's our unified demo page. First, the Arc integration for direct USDC payments. I'll connect my wallet, select the Pro plan at nine ninety-nine per month, and choose Direct USDC as my payment method. After approving the USDC spending and confirming the subscription transaction, I'm subscribed. The merchant receives USDC instantly via Circle's Arc infrastructure.

But what if my funds are on a different chain? With LI.FI integration, users can pay from ANY EVM chain. Watch this - I'll select the Enterprise plan, choose Cross-Chain payment, and pick Polygon as my source chain. LI.FI fetches the best route, and with one click, it handles the swap, the bridge, and the final subscription in a single seamless flow.

Now here's the game-changer: Yellow Network micropayments. I'll select the Starter plan with micropayment option. Opening a payment session creates an off-chain state channel. Now watch - each API call deducts from my balance INSTANTLY with zero gas fees. I can make thousands of these payments. When I'm done, I close the session, and only the final settlement goes on-chain.

Under the hood, FlexSub combines three cutting-edge protocols: Arc for stable USDC settlement, LI.FI for cross-chain liquidity, and Yellow Network for instant off-chain payments. All unified in a single SDK and smart contract.

FlexSub - Subscribe from any chain. Pay instantly. Settle in USDC. Built for HackMoney 2026. Thank you for watching!
```

---

## 📋 Recording Checklist

### Before Recording
- [ ] Start local environment: `pnpm dev:all`
- [ ] Clear browser cache
- [ ] Have MetaMask connected with test account
- [ ] Fund test account with ETH and USDC
- [ ] Test each flow once to ensure it works

### Screen Setup
- [ ] Resolution: 1920x1080 (Full HD)
- [ ] Browser: Chrome or Firefox
- [ ] Clean desktop (hide unnecessary apps)
- [ ] Use browser zoom if text is too small

### Audio
- [ ] Use AI voice (ElevenLabs recommended) or record your own
- [ ] Background music optional (keep low volume)
- [ ] Export as MP3 at 192kbps+

### Video
- [ ] Record at 1080p 30fps
- [ ] Export as MP4 (H.264)
- [ ] Keep under 100MB for easy upload

---

## 🎵 Recommended AI Voice Settings

### ElevenLabs
- Voice: "Adam" or "Rachel" (professional tone)
- Stability: 0.5
- Clarity: 0.75
- Style: 0.3

### Alternative: Play.ht
- Voice: "Sara" or "Michael"
- Speed: 1.0x
- Pitch: Normal

---

## 📁 Final Deliverables

1. **Video file**: `flexsub_demo.mp4` (2:30-3:00)
2. **Transcript**: This document
3. **GitHub link**: Include in ETHGlobal submission
4. **Architecture diagram**: `docs/ARCHITECTURE.md`
