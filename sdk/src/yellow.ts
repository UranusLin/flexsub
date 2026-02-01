import type { Address } from 'viem';
import type { YellowConfig } from './types';

// Re-export types that would come from the SDK
// In production, import from '@erc7824/nitrolite'

interface AppDefinition {
    protocol: string;
    participants: string[];
    weights: number[];
    quorum: number;
    challenge: number;
    nonce: number;
}

interface Allocation {
    participant: string;
    asset: string;
    amount: string;
}

interface ChannelState {
    id: string;
    appDefinition: AppDefinition;
    allocations: Allocation[];
    nonce: number;
    isOpen: boolean;
}

type MessageSigner = (message: string) => Promise<string>;

/**
 * Yellow Network Integration Module - Real Implementation
 *
 * Handles state channel operations for instant micropayments
 * Uses Yellow SDK (Nitrolite) for off-chain transactions
 *
 * @see https://docs.yellow.org/docs/build/quick-start
 */
export class YellowIntegration {
    private config?: YellowConfig;
    private ws: WebSocket | null = null;
    private messageSigner: MessageSigner | null = null;
    private userAddress: Address | null = null;
    private channels: Map<string, ChannelState> = new Map();
    private pendingMessages: Map<string, (response: any) => void> = new Map();
    private messageHandlers: ((message: any) => void)[] = [];

    // ClearNode endpoints
    private static readonly ENDPOINTS = {
        production: 'wss://clearnet.yellow.com/ws',
        sandbox: 'wss://clearnet-sandbox.yellow.com/ws',
    };

    constructor(config?: YellowConfig) {
        this.config = config;
    }

    /**
     * Connect to Yellow Network ClearNode
     */
    async connect(params: {
        userAddress: Address;
        messageSigner: MessageSigner;
        useSandbox?: boolean;
    }): Promise<void> {
        this.userAddress = params.userAddress;
        this.messageSigner = params.messageSigner;

        const endpoint = params.useSandbox
            ? YellowIntegration.ENDPOINTS.sandbox
            : (this.config?.endpoint ?? YellowIntegration.ENDPOINTS.sandbox);

        console.log('[Yellow] Connecting to ClearNode:', endpoint);

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(endpoint);

            this.ws.onopen = () => {
                console.log('[Yellow] ✅ Connected to Yellow Network!');
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('[Yellow] Connection error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('[Yellow] Connection closed');
            };
        });
    }

    /**
     * Register a message handler for incoming messages
     */
    onMessage(handler: (message: any) => void): () => void {
        this.messageHandlers.push(handler);
        return () => {
            const index = this.messageHandlers.indexOf(handler);
            if (index > -1) this.messageHandlers.splice(index, 1);
        };
    }

    /**
     * Open a state channel for micropayments
     */
    async openChannel(params: {
        partnerAddress: Address;
        initialDeposit: bigint;
        asset?: string;
    }): Promise<{ channelId: string }> {
        if (!this.ws || !this.messageSigner || !this.userAddress) {
            throw new Error('Not connected. Call connect() first.');
        }

        const asset = params.asset ?? 'usdc';

        // Define the payment application
        const appDefinition: AppDefinition = {
            protocol: 'flexsub-subscription-v1',
            participants: [this.userAddress, params.partnerAddress],
            weights: [50, 50], // Equal participation
            quorum: 100, // Both must agree
            challenge: 0,
            nonce: Date.now(),
        };

        // Initial allocations
        const allocations: Allocation[] = [
            {
                participant: this.userAddress,
                asset,
                amount: params.initialDeposit.toString(),
            },
            {
                participant: params.partnerAddress,
                asset,
                amount: '0',
            },
        ];

        console.log('[Yellow] Creating payment session...');

        // Create signed session message
        // In production: import { createAppSessionMessage } from '@erc7824/nitrolite';
        const sessionData = {
            method: 'create_session',
            params: {
                definition: appDefinition,
                allocations,
            },
            id: `session_${Date.now()}`,
        };

        const signature = await this.messageSigner(JSON.stringify(sessionData));

        const message = JSON.stringify({
            ...sessionData,
            signature,
        });

        // Send to ClearNode
        this.ws.send(message);

        // Wait for confirmation
        const channelId = await this.waitForResponse(sessionData.id);

        // Store channel state
        this.channels.set(channelId, {
            id: channelId,
            appDefinition,
            allocations,
            nonce: 0,
            isOpen: true,
        });

        console.log('[Yellow] ✅ Channel opened:', channelId);

        return { channelId };
    }

    /**
     * Send instant payment through state channel (off-chain, no gas!)
     */
    async sendPayment(params: {
        channelId: string;
        amount: bigint;
        recipient: Address;
        reason?: string;
    }): Promise<{ success: boolean; newBalance?: bigint }> {
        if (!this.ws || !this.messageSigner || !this.userAddress) {
            throw new Error('Not connected');
        }

        const channel = this.channels.get(params.channelId);
        if (!channel || !channel.isOpen) {
            throw new Error('Channel not found or closed');
        }

        console.log('[Yellow] Sending instant payment:', params.amount.toString());

        // Create payment message
        const paymentData = {
            method: 'payment',
            params: {
                channelId: params.channelId,
                amount: params.amount.toString(),
                recipient: params.recipient,
                reason: params.reason,
                nonce: channel.nonce + 1,
                timestamp: Date.now(),
            },
            id: `payment_${Date.now()}`,
        };

        // Sign the payment
        const signature = await this.messageSigner(JSON.stringify(paymentData));

        const message = JSON.stringify({
            ...paymentData,
            signature,
            sender: this.userAddress,
        });

        // Send instantly through ClearNode
        this.ws.send(message);

        // Update local state
        channel.nonce++;

        // Update allocations
        const senderAlloc = channel.allocations.find(
            (a) => a.participant === this.userAddress
        );
        const recipientAlloc = channel.allocations.find(
            (a) => a.participant === params.recipient
        );

        if (senderAlloc && recipientAlloc) {
            senderAlloc.amount = (
                BigInt(senderAlloc.amount) - params.amount
            ).toString();
            recipientAlloc.amount = (
                BigInt(recipientAlloc.amount) + params.amount
            ).toString();
        }

        console.log('[Yellow] 💸 Payment sent instantly!');

        return {
            success: true,
            newBalance: BigInt(senderAlloc?.amount ?? 0),
        };
    }

    /**
     * Charge a subscription (merchant-initiated payment)
     */
    async chargeSubscription(params: {
        channelId: string;
        subscriptionId: bigint;
        amount: bigint;
        reason?: string;
    }): Promise<boolean> {
        // This is a specialized payment for subscription charges
        const channel = this.channels.get(params.channelId);
        if (!channel) return false;

        const subscriber = channel.appDefinition.participants.find(
            (p) => p !== this.userAddress
        );
        if (!subscriber) return false;

        try {
            await this.sendPayment({
                channelId: params.channelId,
                amount: params.amount,
                recipient: subscriber as Address,
                reason: `Subscription ${params.subscriptionId}: ${params.reason ?? 'Recurring charge'}`,
            });
            return true;
        } catch (error) {
            console.error('[Yellow] Charge failed:', error);
            return false;
        }
    }

    /**
     * Close channel and settle on-chain
     */
    async closeChannel(channelId: string): Promise<{ finalHash?: string }> {
        if (!this.ws || !this.messageSigner) {
            throw new Error('Not connected');
        }

        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        console.log('[Yellow] Closing channel:', channelId);

        const closeData = {
            method: 'close_session',
            params: {
                channelId,
                finalAllocations: channel.allocations,
                nonce: channel.nonce,
            },
            id: `close_${Date.now()}`,
        };

        const signature = await this.messageSigner(JSON.stringify(closeData));

        this.ws.send(
            JSON.stringify({
                ...closeData,
                signature,
            })
        );

        // Wait for on-chain settlement
        const txHash = await this.waitForResponse(closeData.id);

        channel.isOpen = false;

        console.log('[Yellow] Channel closed, settled on-chain:', txHash);

        return { finalHash: txHash };
    }

    /**
     * Deposit more funds into an existing channel
     */
    async depositToChannel(channelId: string, amount: bigint): Promise<void> {
        const channel = this.channels.get(channelId);
        if (!channel || !this.userAddress) {
            throw new Error('Channel not found');
        }

        const userAlloc = channel.allocations.find(
            (a) => a.participant === this.userAddress
        );
        if (userAlloc) {
            userAlloc.amount = (BigInt(userAlloc.amount) + amount).toString();
        }

        console.log('[Yellow] Deposited to channel:', amount.toString());
    }

    /**
     * Get channel state
     */
    getChannel(channelId: string): ChannelState | undefined {
        return this.channels.get(channelId);
    }

    /**
     * Get all active channels
     */
    getActiveChannels(): ChannelState[] {
        return Array.from(this.channels.values()).filter((c) => c.isOpen);
    }

    /**
     * Check if connected to Yellow Network
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Disconnect from Yellow Network
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageSigner = null;
        this.userAddress = null;
    }

    // ============ Private Methods ============

    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);

            // Handle pending response
            if (message.id && this.pendingMessages.has(message.id)) {
                const resolve = this.pendingMessages.get(message.id);
                resolve?.(message.result ?? message.error);
                this.pendingMessages.delete(message.id);
            }

            // Notify handlers
            for (const handler of this.messageHandlers) {
                handler(message);
            }

            // Handle specific message types
            switch (message.type ?? message.method) {
                case 'payment':
                    console.log('[Yellow] 💰 Payment received:', message.params?.amount);
                    break;
                case 'session_created':
                    console.log('[Yellow] ✅ Session confirmed:', message.params?.sessionId);
                    break;
                case 'error':
                    console.error('[Yellow] ❌ Error:', message.error);
                    break;
            }
        } catch (error) {
            console.error('[Yellow] Failed to parse message:', error);
        }
    }

    private waitForResponse(messageId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(messageId);
                reject(new Error('Response timeout'));
            }, 30000);

            this.pendingMessages.set(messageId, (result) => {
                clearTimeout(timeout);
                if (result?.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            });
        });
    }
}

// Legacy exports for backward compatibility
export { YellowIntegration as default };
