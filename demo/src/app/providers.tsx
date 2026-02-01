'use client';

import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, type Chain } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';

// ============ Network Configurations ============

// Anvil local chain
const anvil: Chain = {
    id: 31337,
    name: 'Anvil Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
    },
    testnet: true,
};

// Supported networks with contract addresses
export const NETWORK_CONFIGS: Record<number, {
    name: string;
    contractAddress: `0x${string}` | null;
    usdcAddress: `0x${string}`;
    rpcUrl: string;
    explorerUrl?: string;
    faucetUrl?: string;
}> = {
    // Anvil (Local)
    31337: {
        name: 'Anvil Local',
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Anvil deploy address
        usdcAddress: '0x1234567890123456789012345678901234567890', // Mock
        rpcUrl: 'http://127.0.0.1:8545',
    },
    // Arbitrum Sepolia (Testnet)
    421614: {
        name: 'Arbitrum Sepolia',
        contractAddress: null, // TODO: Deploy and update
        usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Circle USDC on Arb Sepolia
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        explorerUrl: 'https://sepolia.arbiscan.io',
        faucetUrl: 'https://faucet.circle.com/',
    },
    // Base Sepolia (Testnet)
    84532: {
        name: 'Base Sepolia',
        contractAddress: null, // TODO: Deploy and update
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Circle USDC on Base Sepolia
        rpcUrl: 'https://sepolia.base.org',
        explorerUrl: 'https://sepolia.basescan.org',
        faucetUrl: 'https://faucet.circle.com/',
    },
};

// All supported chains
const chains = [anvil, arbitrumSepolia, baseSepolia] as const;

// RainbowKit + wagmi config
const config = getDefaultConfig({
    appName: 'FlexSub',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'flexsub-demo',
    chains: chains,
    transports: {
        [anvil.id]: http('http://127.0.0.1:8545'),
        [arbitrumSepolia.id]: http(NETWORK_CONFIGS[421614].rpcUrl),
        [baseSepolia.id]: http(NETWORK_CONFIGS[84532].rpcUrl),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#6366f1',
                        accentColorForeground: 'white',
                        borderRadius: 'medium',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

// ============ Helper Functions ============

// Get config for current chain
export function getNetworkConfig(chainId: number) {
    return NETWORK_CONFIGS[chainId] || null;
}

// Check if contract is deployed on chain
export function isContractDeployed(chainId: number): boolean {
    const config = NETWORK_CONFIGS[chainId];
    return config?.contractAddress !== null;
}

// Get contract address for chain (throws if not deployed)
export function getContractAddress(chainId: number): `0x${string}` {
    const config = NETWORK_CONFIGS[chainId];
    if (!config || !config.contractAddress) {
        throw new Error(`Contract not deployed on chain ${chainId}`);
    }
    return config.contractAddress;
}

// Legacy export for backward compatibility
export const FLEXSUB_CONFIG = {
    contractAddress: NETWORK_CONFIGS[31337].contractAddress!,
    usdcAddress: NETWORK_CONFIGS[31337].usdcAddress,
    rpcUrl: NETWORK_CONFIGS[31337].rpcUrl,
    chainId: 31337,
};

// Export chains and config
export { anvil, arbitrumSepolia, baseSepolia, chains, config };
