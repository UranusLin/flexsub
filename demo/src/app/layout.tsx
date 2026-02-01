import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from './providers';

export const metadata: Metadata = {
    title: 'FlexSub - Cross-chain Instant Subscription Protocol',
    description: 'Subscribe from any chain. Pay instantly. Settle in USDC. Built with LI.FI, Yellow, and Arc.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Web3Provider>{children}</Web3Provider>
            </body>
        </html>
    );
}
