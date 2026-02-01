import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    formatUnits,
    encodeFunctionData,
    type Address,
    type Hash,
    type PublicClient,
    type WalletClient,
} from 'viem';
import { arbitrum } from 'viem/chains';
import type { TransactionResult } from './types';

// ERC20 ABI for USDC operations
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

/**
 * Arc/Circle Integration Module - Real Implementation
 *
 * Handles USDC settlement and Circle Wallet integration
 * Uses Circle's developer tools for stable payment processing
 *
 * @see https://developers.circle.com/wallets
 * @see https://docs.arc.network/arc/concepts/welcome-to-arc
 */
export class ArcIntegration {
    private usdcAddress: Address;
    private publicClient: PublicClient;
    private walletClient: WalletClient | null = null;
    private rpcUrl: string;

    // Arc mainnet USDC address (on Arbitrum)
    static readonly DEFAULT_USDC_ADDRESS: Address =
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

    constructor(usdcAddress?: Address, rpcUrl?: string) {
        this.usdcAddress = usdcAddress ?? ArcIntegration.DEFAULT_USDC_ADDRESS;
        this.rpcUrl = rpcUrl ?? 'https://arb1.arbitrum.io/rpc';

        this.publicClient = createPublicClient({
            chain: arbitrum,
            transport: http(this.rpcUrl),
        });
    }

    /**
     * Connect a wallet for write operations
     */
    connectWallet(walletClient: WalletClient): void {
        this.walletClient = walletClient;
        console.log('[Arc] Wallet connected');
    }

    /**
     * Get USDC balance for an address
     */
    async getBalance(address: Address): Promise<{
        raw: bigint;
        formatted: string;
    }> {
        const balance = await this.publicClient.readContract({
            address: this.usdcAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
        });

        return {
            raw: balance,
            formatted: formatUnits(balance, 6), // USDC has 6 decimals
        };
    }

    /**
     * Check current allowance
     */
    async getAllowance(owner: Address, spender: Address): Promise<bigint> {
        return await this.publicClient.readContract({
            address: this.usdcAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [owner, spender],
        });
    }

    /**
     * Approve USDC spending for FlexSub contract
     */
    async approveSpending(
        spender: Address,
        amount: string | bigint
    ): Promise<TransactionResult> {
        if (!this.walletClient) {
            throw new Error('Wallet not connected');
        }

        const amountBigInt =
            typeof amount === 'string' ? parseUnits(amount, 6) : amount;

        console.log('[Arc] Approving USDC spending:', amountBigInt.toString());

        const hash = await (this.walletClient as any).writeContract({
            address: this.usdcAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, amountBigInt],
        });

        // Wait for confirmation
        await this.publicClient.waitForTransactionReceipt({ hash });

        console.log('[Arc] Approval confirmed:', hash);

        return { hash, success: true };
    }

    /**
     * Transfer USDC directly
     */
    async transfer(to: Address, amount: string): Promise<TransactionResult> {
        if (!this.walletClient) {
            throw new Error('Wallet not connected');
        }

        const amountBigInt = parseUnits(amount, 6);

        console.log('[Arc] Transferring USDC:', amount, 'to', to);

        const hash = await (this.walletClient as any).writeContract({
            address: this.usdcAddress,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, amountBigInt],
        });

        await this.publicClient.waitForTransactionReceipt({ hash });

        console.log('[Arc] Transfer confirmed:', hash);

        return { hash, success: true };
    }

    /**
     * Withdraw accumulated funds to a Circle Wallet or any address
     */
    async withdrawToCircleWallet(
        to: Address,
        amount: string
    ): Promise<TransactionResult> {
        // For now, this is a simple USDC transfer
        // In production, this would integrate with Circle's Programmable Wallets API
        // for enhanced features like:
        // - Developer-controlled or user-controlled wallets
        // - Multi-party computation (MPC) for key security
        // - Transaction policies and spending limits

        console.log('[Arc] Withdrawing to Circle Wallet:', amount, 'USDC');

        return this.transfer(to, amount);
    }

    /**
     * Batch withdraw to multiple recipients
     * Useful for settling multiple subscription payments at once
     */
    async batchWithdraw(
        recipients: { address: Address; amount: string }[]
    ): Promise<{ successful: number; failed: number; hashes: Hash[] }> {
        const results = {
            successful: 0,
            failed: 0,
            hashes: [] as Hash[],
        };

        for (const recipient of recipients) {
            try {
                const result = await this.transfer(recipient.address, recipient.amount);
                if (result.success) {
                    results.successful++;
                    results.hashes.push(result.hash);
                } else {
                    results.failed++;
                }
            } catch (error) {
                console.error('[Arc] Batch transfer failed for', recipient.address, error);
                results.failed++;
            }
        }

        return results;
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(params: {
        to: Address;
        amount: string;
    }): Promise<{ gas: bigint; gasPrice: bigint; estimatedCost: string }> {
        const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [params.to, parseUnits(params.amount, 6)],
        });

        const [gas, gasPrice] = await Promise.all([
            this.publicClient.estimateGas({
                to: this.usdcAddress,
                data,
            }),
            this.publicClient.getGasPrice(),
        ]);

        return {
            gas,
            gasPrice,
            estimatedCost: formatUnits(gas * gasPrice, 18), // ETH
        };
    }

    /**
     * Get the USDC token address
     */
    getUsdcAddress(): Address {
        return this.usdcAddress;
    }

    /**
     * Format amount from raw to human-readable
     */
    formatAmount(amount: bigint): string {
        return formatUnits(amount, 6);
    }

    /**
     * Parse amount from human-readable to raw
     */
    parseAmount(amount: string): bigint {
        return parseUnits(amount, 6);
    }

    /**
     * Check if connected to Arc-compatible chain
     */
    async isConnected(): Promise<boolean> {
        try {
            await this.publicClient.getBlockNumber();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current block number (useful for subscription timing)
     */
    async getBlockNumber(): Promise<bigint> {
        return this.publicClient.getBlockNumber();
    }

    /**
     * Watch for incoming USDC transfers (for real-time updates)
     */
    watchTransfers(
        address: Address,
        onTransfer: (from: Address, amount: bigint) => void
    ): () => void {
        // In production, this would use event logs
        // For now, return a no-op unsubscribe function
        console.log('[Arc] Watching transfers for:', address);

        return () => {
            console.log('[Arc] Stopped watching transfers');
        };
    }
}

export default ArcIntegration;
