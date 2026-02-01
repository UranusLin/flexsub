'use client';

import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

// Define Anvil local chain
const anvil = {
    id: 31337,
    name: 'Anvil Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
    },
    testnet: true,
} as const;

// RainbowKit + wagmi config
const config = getDefaultConfig({
    appName: 'FlexSub',
    projectId: 'flexsub-demo', // WalletConnect project ID (get from cloud.walletconnect.com)
    chains: [anvil],
    transports: {
        [anvil.id]: http('http://127.0.0.1:8545'),
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

// FlexSub contract config
export const FLEXSUB_CONFIG = {
    // Default Anvil deployment address (update after each deploy)
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const,
    // Mock USDC for local testing
    usdcAddress: '0x1234567890123456789012345678901234567890' as const,
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
};

// Export chain for use elsewhere
export { anvil, config };
