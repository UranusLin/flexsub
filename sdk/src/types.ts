import type { Address, Hash } from 'viem';

// ============ Configuration ============

export interface FlexSubConfig {
    /** RPC URL for the target chain (Arc) */
    rpcUrl: string;
    /** FlexSubManager contract address */
    contractAddress: Address;
    /** USDC token address */
    usdcAddress: Address;
    /** Optional: Yellow Network configuration */
    yellow?: YellowConfig;
    /** Optional: LI.FI configuration */
    lifi?: LiFiConfig;
}

export interface YellowConfig {
    /** Yellow SDK API key */
    apiKey: string;
    /** Yellow network endpoint */
    endpoint: string;
}

export interface LiFiConfig {
    /** Supported source chains */
    supportedChains: ChainId[];
}

// ============ Chain Types ============

export type ChainId =
    | 1 // Ethereum
    | 10 // Optimism
    | 137 // Polygon
    | 42161 // Arbitrum
    | 8453; // Base

export const CHAIN_NAMES: Record<ChainId, string> = {
    1: 'Ethereum',
    10: 'Optimism',
    137: 'Polygon',
    42161: 'Arbitrum',
    8453: 'Base',
};

// ============ Plan Types ============

export interface CreatePlanParams {
    /** Price per period in USDC (e.g., "9.99") */
    price: string;
    /** Period duration */
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    /** Human-readable plan name */
    name: string;
}

export interface Plan {
    id: bigint;
    merchant: Address;
    pricePerPeriod: bigint;
    periodDuration: bigint;
    name: string;
    isActive: boolean;
    totalSubscribers: bigint;
}

// ============ Subscription Types ============

export interface SubscribeParams {
    /** Plan ID to subscribe to */
    planId: bigint;
    /** Token to pay with (will be swapped to USDC) */
    paymentToken?: Address;
    /** Source chain ID (for cross-chain deposits) */
    sourceChain?: ChainId;
}

export interface Subscription {
    id: bigint;
    planId: bigint;
    subscriber: Address;
    startTime: bigint;
    lastChargeTime: bigint;
    totalCharged: bigint;
    isActive: boolean;
}

// ============ Charge Types ============

export interface ChargeParams {
    /** Subscription ID to charge */
    subscriptionId: bigint;
    /** Amount to charge in USDC (e.g., "0.50") */
    amount: string;
    /** Optional reason for the charge */
    reason?: string;
}

// ============ Transaction Types ============

export interface TransactionResult {
    hash: Hash;
    success: boolean;
}

// ============ Period Helpers ============

export const PERIOD_SECONDS: Record<CreatePlanParams['period'], number> = {
    daily: 86400,
    weekly: 604800,
    monthly: 2592000, // 30 days
    yearly: 31536000, // 365 days
};
