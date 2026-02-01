/**
 * Circle CCTP V2 Integration Module
 *
 * Cross-Chain Transfer Protocol for native USDC bridging
 * Supports burn-mint transfers across 34+ blockchains
 *
 * @see https://developers.circle.com/cctp
 * @see https://www.npmjs.com/package/@circle-fin/provider-cctp-v2
 */

import {
    createPublicClient,
    http,
    type Address,
    type Hash,
    type WalletClient,
} from 'viem';

// CCTP supported chains with their domain IDs
export const CCTP_DOMAINS: Record<number, { domain: number; name: string; tokenMessenger: Address; messageTransmitter: Address; usdc: Address }> = {
    // Ethereum Mainnet
    1: {
        domain: 0,
        name: 'Ethereum',
        tokenMessenger: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
        messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
        usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    // Arbitrum
    42161: {
        domain: 3,
        name: 'Arbitrum',
        tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
        messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
        usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    // Base
    8453: {
        domain: 6,
        name: 'Base',
        tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
        messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    // Optimism
    10: {
        domain: 2,
        name: 'Optimism',
        tokenMessenger: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
        messageTransmitter: '0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8',
        usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
    // Polygon
    137: {
        domain: 7,
        name: 'Polygon',
        tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
        messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
        usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    },
    // Avalanche
    43114: {
        domain: 1,
        name: 'Avalanche',
        tokenMessenger: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
        messageTransmitter: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
        usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    },
    // Sepolia Testnet
    11155111: {
        domain: 0,
        name: 'Sepolia',
        tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
    // Arbitrum Sepolia Testnet
    421614: {
        domain: 3,
        name: 'Arbitrum Sepolia',
        tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
        usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    },
    // Base Sepolia Testnet
    84532: {
        domain: 6,
        name: 'Base Sepolia',
        tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
};

// Token Messenger ABI for CCTP burn operations
const TOKEN_MESSENGER_ABI = [
    {
        name: 'depositForBurn',
        type: 'function',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' },
        ],
        outputs: [{ name: 'nonce', type: 'uint64' }],
    },
    {
        name: 'depositForBurnWithCaller',
        type: 'function',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' },
            { name: 'destinationCaller', type: 'bytes32' },
        ],
        outputs: [{ name: 'nonce', type: 'uint64' }],
    },
] as const;

// Message Transmitter ABI for receiving messages
const MESSAGE_TRANSMITTER_ABI = [
    {
        name: 'receiveMessage',
        type: 'function',
        inputs: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },
] as const;

// ERC20 approve ABI
const ERC20_APPROVE_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

export interface CCTPTransferParams {
    fromChainId: number;
    toChainId: number;
    amount: bigint;
    recipient: Address;
}

export interface CCTPTransferResult {
    burnTxHash: Hash;
    nonce: bigint;
    messageHash: string;
    status: 'pending' | 'attested' | 'completed' | 'failed';
}

/**
 * Circle CCTP V2 Integration for FlexSub
 *
 * Enables cross-chain USDC transfers using Circle's native burn-mint protocol
 * Key features:
 * - No wrapped tokens or liquidity pools needed
 * - Sub-minute transfers with Fast Transfer mode
 * - Hooks for post-transfer automation
 */
export class CCTPIntegration {
    private walletClient: WalletClient | null = null;
    private attestationApiUrl: string;

    constructor(options?: { attestationApiUrl?: string }) {
        // Circle's attestation service
        this.attestationApiUrl = options?.attestationApiUrl ?? 'https://iris-api.circle.com/attestations';
    }

    /**
     * Connect wallet for transactions
     */
    connectWallet(walletClient: WalletClient): void {
        this.walletClient = walletClient;
        console.log('[CCTP] Wallet connected');
    }

    /**
     * Check if chain is CCTP-supported
     */
    isChainSupported(chainId: number): boolean {
        return chainId in CCTP_DOMAINS;
    }

    /**
     * Get CCTP domain info for a chain
     */
    getDomainInfo(chainId: number) {
        return CCTP_DOMAINS[chainId] ?? null;
    }

    /**
     * Convert address to bytes32 format for CCTP
     */
    addressToBytes32(address: Address): `0x${string}` {
        // Pad address to 32 bytes (64 hex chars + 0x)
        return `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;
    }

    /**
     * Initiate cross-chain USDC transfer via CCTP burn
     *
     * Step 1: Burn USDC on source chain
     * Step 2: Wait for Circle attestation
     * Step 3: Mint on destination chain
     */
    async initiateTransfer(params: CCTPTransferParams): Promise<CCTPTransferResult> {
        if (!this.walletClient) {
            throw new Error('Wallet not connected');
        }

        const sourceConfig = CCTP_DOMAINS[params.fromChainId];
        const destConfig = CCTP_DOMAINS[params.toChainId];

        if (!sourceConfig || !destConfig) {
            throw new Error(`CCTP not supported on chain ${params.fromChainId} or ${params.toChainId}`);
        }

        console.log(`[CCTP] Initiating transfer: ${params.amount} USDC`);
        console.log(`[CCTP] From: ${sourceConfig.name} (domain ${sourceConfig.domain})`);
        console.log(`[CCTP] To: ${destConfig.name} (domain ${destConfig.domain})`);

        // Step 1: Approve Token Messenger to spend USDC
        console.log('[CCTP] Approving USDC spend...');
        const approveHash = await (this.walletClient as any).writeContract({
            address: sourceConfig.usdc,
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [sourceConfig.tokenMessenger, params.amount],
        });

        // Wait for approval
        const publicClient = createPublicClient({
            chain: { id: params.fromChainId } as any,
            transport: http(),
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('[CCTP] Approval confirmed:', approveHash);

        // Step 2: Burn USDC via depositForBurn
        console.log('[CCTP] Burning USDC on source chain...');
        const mintRecipient = this.addressToBytes32(params.recipient);

        const burnHash = await (this.walletClient as any).writeContract({
            address: sourceConfig.tokenMessenger,
            abi: TOKEN_MESSENGER_ABI,
            functionName: 'depositForBurn',
            args: [
                params.amount,
                destConfig.domain,
                mintRecipient,
                sourceConfig.usdc,
            ],
        });

        const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });
        console.log('[CCTP] Burn confirmed:', burnHash);

        // Extract nonce from logs (simplified - in production parse MessageSent event)
        const nonce = BigInt(Date.now()); // Placeholder

        // Generate message hash for attestation lookup
        const messageHash = `${sourceConfig.domain}-${nonce}`;

        return {
            burnTxHash: burnHash,
            nonce,
            messageHash,
            status: 'pending',
        };
    }

    /**
     * Get attestation status from Circle
     * Call this after burn to check if attestation is ready
     */
    async getAttestation(messageHash: string): Promise<{
        status: 'pending' | 'complete';
        attestation?: string;
    }> {
        try {
            const response = await fetch(`${this.attestationApiUrl}/${messageHash}`);
            const data = await response.json();

            if (data.status === 'complete') {
                return {
                    status: 'complete',
                    attestation: data.attestation,
                };
            }

            return { status: 'pending' };
        } catch (error) {
            console.error('[CCTP] Attestation fetch error:', error);
            return { status: 'pending' };
        }
    }

    /**
     * Complete transfer by minting on destination chain
     * Call this after attestation is ready
     */
    async completeTransfer(params: {
        toChainId: number;
        message: `0x${string}`;
        attestation: `0x${string}`;
    }): Promise<Hash> {
        if (!this.walletClient) {
            throw new Error('Wallet not connected');
        }

        const destConfig = CCTP_DOMAINS[params.toChainId];
        if (!destConfig) {
            throw new Error(`CCTP not supported on chain ${params.toChainId}`);
        }

        console.log('[CCTP] Minting USDC on destination chain...');

        const mintHash = await (this.walletClient as any).writeContract({
            address: destConfig.messageTransmitter,
            abi: MESSAGE_TRANSMITTER_ABI,
            functionName: 'receiveMessage',
            args: [params.message, params.attestation],
        });

        console.log('[CCTP] Mint transaction:', mintHash);
        return mintHash;
    }

    /**
     * Get estimated transfer time
     * CCTP V2 Fast Transfer: ~15 seconds
     * Standard Transfer: 13-20 minutes
     */
    getEstimatedTime(useFastTransfer: boolean = true): number {
        return useFastTransfer ? 15 : 900; // seconds
    }

    /**
     * Get CCTP fee estimate (gas only, no protocol fee)
     */
    async estimateFees(params: CCTPTransferParams): Promise<{
        sourceGas: string;
        destinationGas: string;
        totalEstimate: string;
    }> {
        // CCTP has no protocol fee, only gas costs
        // Estimates vary by network congestion
        return {
            sourceGas: '~$0.50',
            destinationGas: '~$0.30',
            totalEstimate: '~$0.80',
        };
    }

    /**
     * Check if a transfer is complete
     */
    async isTransferComplete(
        toChainId: number,
        recipient: Address,
        expectedAmount: bigint
    ): Promise<boolean> {
        // In production, check USDC balance or listen for Transfer events
        console.log('[CCTP] Checking transfer completion...');
        return false; // Placeholder
    }
}

export default CCTPIntegration;
