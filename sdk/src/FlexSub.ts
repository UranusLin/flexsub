import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import type { Address, Hash, PublicClient, WalletClient } from 'viem';

import { LiFiIntegration } from './lifi';
import { YellowIntegration } from './yellow';
import { ArcIntegration } from './arc';
import { CCTPIntegration } from './cctp';
import type {
    FlexSubConfig,
    CreatePlanParams,
    Plan,
    SubscribeParams,
    Subscription,
    ChargeParams,
    TransactionResult,
    PERIOD_SECONDS,
} from './types';

// FlexSubManager ABI (simplified for SDK)
const FLEXSUB_ABI = [
    {
        name: 'createPlan',
        type: 'function',
        inputs: [
            { name: 'pricePerPeriod', type: 'uint256' },
            { name: 'periodDuration', type: 'uint256' },
            { name: 'name', type: 'string' },
        ],
        outputs: [{ name: 'planId', type: 'uint256' }],
    },
    {
        name: 'subscribe',
        type: 'function',
        inputs: [{ name: 'planId', type: 'uint256' }],
        outputs: [{ name: 'subscriptionId', type: 'uint256' }],
    },
    {
        name: 'charge',
        type: 'function',
        inputs: [
            { name: 'subscriptionId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'cancelSubscription',
        type: 'function',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'getPlan',
        type: 'function',
        inputs: [{ name: 'planId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'merchant', type: 'address' },
                    { name: 'pricePerPeriod', type: 'uint256' },
                    { name: 'periodDuration', type: 'uint256' },
                    { name: 'name', type: 'string' },
                    { name: 'isActive', type: 'bool' },
                    { name: 'totalSubscribers', type: 'uint256' },
                ],
            },
        ],
    },
    {
        name: 'getSubscription',
        type: 'function',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'planId', type: 'uint256' },
                    { name: 'subscriber', type: 'address' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'lastChargeTime', type: 'uint256' },
                    { name: 'totalCharged', type: 'uint256' },
                    { name: 'isActive', type: 'bool' },
                ],
            },
        ],
    },
] as const;

/**
 * FlexSub SDK - Main class for interacting with FlexSub Protocol
 *
 * @example
 * ```typescript
 * const flexsub = new FlexSub({
 *   rpcUrl: 'https://rpc.arc.network',
 *   contractAddress: '0x...',
 *   usdcAddress: '0x...',
 * });
 *
 * // Create a subscription plan
 * const plan = await flexsub.createPlan({
 *   name: 'Pro Plan',
 *   price: '9.99',
 *   period: 'monthly',
 * });
 *
 * // Subscribe to a plan
 * const subscription = await flexsub.subscribe({
 *   planId: plan.id,
 *   sourceChain: 42161, // Arbitrum
 *   paymentToken: '0x...', // ETH or any token
 * });
 * ```
 */
export class FlexSub {
    private config: FlexSubConfig;
    private publicClient: PublicClient;
    private walletClient: WalletClient | null = null;

    // Integration modules
    public lifi: LiFiIntegration;
    public yellow: YellowIntegration;
    public arc: ArcIntegration;
    public cctp: CCTPIntegration;

    constructor(config: FlexSubConfig) {
        this.config = config;

        // Initialize public client for read operations
        this.publicClient = createPublicClient({
            transport: http(config.rpcUrl),
        });

        // Initialize integration modules
        this.lifi = new LiFiIntegration(config.lifi);
        this.yellow = new YellowIntegration(config.yellow);
        this.arc = new ArcIntegration(config.usdcAddress);
        this.cctp = new CCTPIntegration();
    }

    /**
     * Connect a wallet for write operations
     */
    async connect(walletClient: WalletClient): Promise<void> {
        this.walletClient = walletClient;
    }

    // ============ Merchant Functions ============

    /**
     * Create a new subscription plan
     */
    async createPlan(params: CreatePlanParams): Promise<Plan> {
        if (!this.walletClient) throw new Error('Wallet not connected');

        const periodSeconds = {
            daily: 86400,
            weekly: 604800,
            monthly: 2592000,
            yearly: 31536000,
        }[params.period];

        // Convert price to USDC decimals (6)
        const priceInUnits = parseUnits(params.price, 6);

        const hash = await (this.walletClient as any).writeContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'createPlan',
            args: [priceInUnits, BigInt(periodSeconds), params.name],
        });

        // Wait for transaction and get plan ID from event
        // In production, we'd parse the event logs
        console.log('Plan created, tx:', hash);

        // Return mock plan for now - would parse from events
        return {
            id: 1n,
            merchant: this.walletClient.account?.address as Address,
            pricePerPeriod: priceInUnits,
            periodDuration: BigInt(periodSeconds),
            name: params.name,
            isActive: true,
            totalSubscribers: 0n,
        };
    }

    /**
     * Get a plan by ID
     */
    async getPlan(planId: bigint): Promise<Plan> {
        const result = await this.publicClient.readContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'getPlan',
            args: [planId],
        }) as {
            merchant: Address;
            pricePerPeriod: bigint;
            periodDuration: bigint;
            name: string;
            isActive: boolean;
            totalSubscribers: bigint;
        };

        return {
            id: planId,
            merchant: result.merchant,
            pricePerPeriod: result.pricePerPeriod,
            periodDuration: result.periodDuration,
            name: result.name,
            isActive: result.isActive,
            totalSubscribers: result.totalSubscribers,
        };
    }

    // ============ Subscriber Functions ============

    /**
     * Subscribe to a plan with optional cross-chain deposit
     */
    async subscribe(params: SubscribeParams): Promise<Subscription> {
        if (!this.walletClient) throw new Error('Wallet not connected');

        // If cross-chain deposit is needed, use LI.FI first
        if (params.sourceChain && params.paymentToken) {
            const plan = await this.getPlan(params.planId);
            const userAddress = this.walletClient.account?.address as Address;

            console.log('Initiating cross-chain deposit via LI.FI...');
            await this.lifi.crossChainDeposit({
                fromChain: params.sourceChain,
                fromToken: params.paymentToken,
                fromAmount: formatUnits(plan.pricePerPeriod, 6),
                fromAddress: userAddress,
            });
        }

        // Open Yellow state channel for micropayments
        const userAddress = this.walletClient.account?.address as Address;
        const merchantPlan = await this.getPlan(params.planId);
        console.log('Opening Yellow state channel...');
        await this.yellow.openChannel({
            partnerAddress: merchantPlan.merchant,
            initialDeposit: merchantPlan.pricePerPeriod * 12n, // Pre-fund 12 periods
        });

        // Execute subscription on-chain
        const hash = await (this.walletClient as any).writeContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'subscribe',
            args: [params.planId],
        });

        console.log('Subscribed, tx:', hash);

        return {
            id: 1n,
            planId: params.planId,
            subscriber: this.walletClient.account?.address as Address,
            startTime: BigInt(Date.now() / 1000),
            lastChargeTime: BigInt(Date.now() / 1000),
            totalCharged: 0n,
            isActive: true,
        };
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId: bigint): Promise<TransactionResult> {
        if (!this.walletClient) throw new Error('Wallet not connected');

        const hash = await (this.walletClient as any).writeContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'cancelSubscription',
            args: [subscriptionId],
        });

        return { hash, success: true };
    }

    /**
     * Get a subscription by ID
     */
    async getSubscription(subscriptionId: bigint): Promise<Subscription> {
        const result = await this.publicClient.readContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'getSubscription',
            args: [subscriptionId],
        }) as {
            planId: bigint;
            subscriber: Address;
            startTime: bigint;
            lastChargeTime: bigint;
            totalCharged: bigint;
            isActive: boolean;
        };

        return {
            id: subscriptionId,
            planId: result.planId,
            subscriber: result.subscriber,
            startTime: result.startTime,
            lastChargeTime: result.lastChargeTime,
            totalCharged: result.totalCharged,
            isActive: result.isActive,
        };
    }

    // ============ Merchant Charge Functions ============

    /**
     * Charge a subscription (via Yellow state channel for instant micropayments)
     */
    async charge(params: ChargeParams): Promise<TransactionResult> {
        if (!this.walletClient) throw new Error('Wallet not connected');

        const amountInUnits = parseUnits(params.amount, 6);

        // Try Yellow off-chain charge first for instant settlement
        const channelId = `channel_${params.subscriptionId}`; // Simplified for demo
        const offChainSuccess = await this.yellow.chargeSubscription({
            channelId,
            subscriptionId: params.subscriptionId,
            amount: amountInUnits,
        });

        if (offChainSuccess) {
            console.log('Charged via Yellow (off-chain):', params.amount, 'USDC');
            return { hash: '0x' as Hash, success: true };
        }

        // Fallback to on-chain charge
        const hash = await (this.walletClient as any).writeContract({
            address: this.config.contractAddress,
            abi: FLEXSUB_ABI,
            functionName: 'charge',
            args: [params.subscriptionId, amountInUnits],
        });

        return { hash, success: true };
    }

    // ============ Settlement Functions ============

    /**
     * Withdraw accumulated funds to Circle Wallet
     */
    async withdraw(to: Address, amount: string): Promise<TransactionResult> {
        return this.arc.withdrawToCircleWallet(to, amount);
    }
}
