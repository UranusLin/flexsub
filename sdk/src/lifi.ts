import {
    createConfig,
    getQuote,
    getRoutes,
    executeRoute,
    type Route,
    type LiFiStep,
    type QuoteRequest,
    type RoutesRequest,
    type ExecutionOptions,
} from '@lifi/sdk';
import type { Address } from 'viem';
import type { LiFiConfig, ChainId } from './types';

// USDC addresses on different chains
const USDC_ADDRESSES: Record<ChainId, Address> = {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
};

/**
 * LI.FI Integration Module - Real Implementation
 *
 * Handles cross-chain deposits from any EVM chain to the target chain
 * Converts any token to USDC for subscription payments
 *
 * @see https://docs.li.fi/sdk/overview
 */
export class LiFiIntegration {
    private config?: LiFiConfig;
    private initialized: boolean = false;

    constructor(config?: LiFiConfig) {
        this.config = config;
    }

    /**
     * Initialize LI.FI SDK - must be called before other methods
     */
    initialize(): void {
        if (this.initialized) return;

        createConfig({
            integrator: 'FlexSub',
            // Add RPC overrides if needed
            // rpcUrls: { ... }
        });

        this.initialized = true;
        console.log('[LI.FI] SDK initialized');
    }

    /**
     * Get a quote for cross-chain swap to USDC
     */
    async getQuote(params: {
        fromChain: ChainId;
        fromToken: Address;
        fromAmount: string;
        fromAddress: Address;
        toChain?: ChainId;
    }): Promise<{
        quote: LiFiStep;
        toAmount: string;
        estimatedGas: string;
        estimatedTime: number;
    }> {
        this.ensureInitialized();

        const toChain = params.toChain ?? 42161; // Default to Arbitrum (Arc compatible)
        const toToken = USDC_ADDRESSES[toChain];

        console.log('[LI.FI] Getting quote:', {
            from: `${params.fromChain}:${params.fromToken}`,
            to: `${toChain}:${toToken}`,
            amount: params.fromAmount,
        });

        const quoteRequest: QuoteRequest = {
            fromChain: params.fromChain,
            toChain: toChain,
            fromToken: params.fromToken,
            toToken: toToken,
            fromAmount: params.fromAmount,
            fromAddress: params.fromAddress,
        };

        const quote = await getQuote(quoteRequest);

        return {
            quote,
            toAmount: quote.estimate.toAmount,
            estimatedGas: quote.estimate.gasCosts?.[0]?.amount ?? '0',
            estimatedTime: quote.estimate.executionDuration,
        };
    }

    /**
     * Get multiple routes for cross-chain swap (returns best options)
     */
    async getRoutes(params: {
        fromChain: ChainId;
        fromToken: Address;
        fromAmount: string;
        toChain?: ChainId;
    }): Promise<Route[]> {
        this.ensureInitialized();

        const toChain = params.toChain ?? 42161;
        const toToken = USDC_ADDRESSES[toChain];

        const routesRequest: RoutesRequest = {
            fromChainId: params.fromChain,
            toChainId: toChain,
            fromTokenAddress: params.fromToken,
            toTokenAddress: toToken,
            fromAmount: params.fromAmount,
            options: {
                order: 'CHEAPEST',
                slippage: 0.005, // 0.5%
            },
        };

        const result = await getRoutes(routesRequest);
        console.log('[LI.FI] Found', result.routes.length, 'routes');

        return result.routes;
    }

    /**
     * Execute a cross-chain swap/bridge
     */
    async executeSwap(
        quoteOrRoute: LiFiStep | Route,
        options?: {
            onStepStarted?: (step: any) => void;
            onStepCompleted?: (step: any) => void;
            onError?: (error: Error) => void;
        }
    ): Promise<{ success: boolean; txHash?: string }> {
        this.ensureInitialized();

        console.log('[LI.FI] Executing route...');

        // Convert LiFiStep to a minimal Route structure if needed
        const route: Route = 'steps' in quoteOrRoute
            ? quoteOrRoute as Route
            : {
                id: quoteOrRoute.id,
                fromChainId: quoteOrRoute.action.fromChainId,
                toChainId: quoteOrRoute.action.toChainId,
                fromAmountUSD: '0',
                toAmountUSD: '0',
                fromAmount: quoteOrRoute.action.fromAmount,
                toAmount: quoteOrRoute.estimate.toAmount,
                fromToken: quoteOrRoute.action.fromToken,
                toToken: quoteOrRoute.action.toToken,
                fromAddress: quoteOrRoute.action.fromAddress,
                toAddress: quoteOrRoute.action.toAddress || quoteOrRoute.action.fromAddress,
                steps: [quoteOrRoute],
            } as Route;

        try {
            const executionOptions: ExecutionOptions = {
                updateRouteHook: (updatedRoute) => {
                    const currentStep = updatedRoute.steps.find(
                        (step) => step.execution?.status === 'PENDING'
                    );
                    if (currentStep) {
                        options?.onStepStarted?.(currentStep);
                    }
                },
            };

            const result = await executeRoute(route, executionOptions);

            // Get the final transaction hash
            const lastStep = result.steps[result.steps.length - 1];
            const txHash = lastStep.execution?.process?.[0]?.txHash;

            console.log('[LI.FI] Route executed successfully:', txHash);

            return {
                success: true,
                txHash,
            };
        } catch (error) {
            console.error('[LI.FI] Execution failed:', error);
            options?.onError?.(error as Error);
            return { success: false };
        }
    }

    /**
     * Execute a complete cross-chain deposit to USDC
     * This is a convenience method that combines getQuote and executeSwap
     */
    async crossChainDeposit(params: {
        fromChain: ChainId;
        fromToken: Address;
        fromAmount: string;
        fromAddress: Address;
        toChain?: ChainId;
        onProgress?: (step: string, progress: number) => void;
    }): Promise<{ success: boolean; txHash?: string; usdcAmount?: string }> {
        this.ensureInitialized();

        params.onProgress?.('Getting quote...', 10);

        // Get best quote
        const { quote, toAmount } = await this.getQuote({
            fromChain: params.fromChain,
            fromToken: params.fromToken,
            fromAmount: params.fromAmount,
            fromAddress: params.fromAddress,
            toChain: params.toChain,
        });

        params.onProgress?.('Executing swap...', 30);

        // Execute the swap
        const result = await this.executeSwap(quote, {
            onStepStarted: (step) => {
                const stepName = step.type === 'swap' ? 'Swapping' : 'Bridging';
                params.onProgress?.(`${stepName}...`, 50);
            },
            onStepCompleted: () => {
                params.onProgress?.('Finalizing...', 80);
            },
        });

        if (result.success) {
            params.onProgress?.('Complete!', 100);
            return {
                success: true,
                txHash: result.txHash,
                usdcAmount: toAmount,
            };
        }

        return { success: false };
    }

    /**
     * Check if a chain is supported
     */
    isChainSupported(chainId: ChainId): boolean {
        const defaultSupported: ChainId[] = [1, 10, 137, 42161, 8453];
        const supported = this.config?.supportedChains ?? defaultSupported;
        return supported.includes(chainId);
    }

    /**
     * Get supported chains
     */
    getSupportedChains(): ChainId[] {
        return this.config?.supportedChains ?? [1, 10, 137, 42161, 8453];
    }

    /**
     * Get USDC address for a chain
     */
    getUsdcAddress(chainId: ChainId): Address {
        return USDC_ADDRESSES[chainId];
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            this.initialize();
        }
    }
}
