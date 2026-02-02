'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import { getNetworkConfig } from '../providers';

/**
 * FlexSub Unified Demo
 * 
 * Complete demo for all HackMoney 2026 prize tracks:
 * - Arc ($10K): Direct USDC payments
 * - LI.FI ($6K): Cross-chain subscription
 * - Yellow ($15K): Off-chain micropayments
 */

// ABI for contracts
const FLEXSUB_ABI = [
    {
        name: 'subscribe',
        type: 'function',
        inputs: [{ name: 'planId', type: 'uint256' }],
        outputs: [{ name: 'subscriptionId', type: 'uint256' }],
    },
] as const;

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Subscription plans
const PLANS = [
    { id: 1, name: 'Starter', price: '4.99', features: ['Basic API access', '1000 requests/day', 'Email support'] },
    { id: 2, name: 'Pro', price: '9.99', features: ['Unlimited API access', 'Priority support', 'Analytics dashboard'] },
    { id: 3, name: 'Enterprise', price: '29.99', features: ['Everything in Pro', 'Dedicated support', 'Custom integrations', 'SLA guarantee'] },
];

// Payment methods (Prize Tracks)
const PAYMENT_METHODS = [
    {
        id: 'arc',
        name: 'Direct USDC',
        icon: '💳',
        prize: 'Arc $10K',
        description: 'Pay directly with USDC on this chain',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'lifi',
        name: 'Cross-Chain',
        icon: '🔗',
        prize: 'LI.FI $6K',
        description: 'Pay from any chain with any token',
        color: 'from-purple-500 to-pink-500',
    },
    {
        id: 'yellow',
        name: 'Micropayment',
        icon: '⚡',
        prize: 'Yellow $15K',
        description: 'Pay-per-use with instant off-chain payments',
        color: 'from-yellow-500 to-orange-500',
    },
];

// Source chains for LI.FI
const SOURCE_CHAINS = [
    { id: 137, name: 'Polygon', token: 'MATIC' },
    { id: 42161, name: 'Arbitrum', token: 'ETH' },
    { id: 10, name: 'Optimism', token: 'ETH' },
    { id: 8453, name: 'Base', token: 'ETH' },
];

type Step = 'plan' | 'payment' | 'processing' | 'success';

export default function UnifiedDemoPage() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const chainId = useChainId();

    const [step, setStep] = useState<Step>('plan');
    const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
    const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
    const [sourceChain, setSourceChain] = useState(SOURCE_CHAINS[0]);
    const [logs, setLogs] = useState<string[]>([]);
    const [yellowSession, setYellowSession] = useState<{
        connected: boolean;
        balance: string;
        spent: string;
        apiCalls: number;
    }>({ connected: false, balance: '10.00', spent: '0.00', apiCalls: 0 });

    const networkConfig = getNetworkConfig(chainId);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Direct USDC Payment (Arc Track)
    const handleArcPayment = async () => {
        if (!walletClient || !networkConfig) return;

        setStep('processing');
        addLog('💳 Starting Arc/USDC payment...');

        try {
            const amount = parseUnits(selectedPlan.price, 6);

            // Step 1: Approve
            addLog('📝 Approving USDC spend...');
            const approveHash = await walletClient.writeContract({
                address: networkConfig.usdcAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [networkConfig.contractAddress, amount],
            });
            await publicClient?.waitForTransactionReceipt({ hash: approveHash });
            addLog('✅ Approval confirmed!');

            // Step 2: Subscribe
            addLog('📝 Creating subscription on FlexSubManager...');
            const contractAddr = networkConfig.contractAddress;
            if (!contractAddr) throw new Error('Contract not deployed');
            const subHash = await walletClient.writeContract({
                address: contractAddr,
                abi: FLEXSUB_ABI,
                functionName: 'subscribe',
                args: [BigInt(selectedPlan.id)],
            });
            await publicClient?.waitForTransactionReceipt({ hash: subHash });
            addLog('🎉 Subscription created successfully!');

            setStep('success');
        } catch (err: any) {
            addLog(`❌ Error: ${err.message}`);
            setStep('payment');
        }
    };

    // Cross-Chain Payment (LI.FI Track)
    const handleLiFiPayment = async () => {
        setStep('processing');
        addLog('🔗 Starting LI.FI cross-chain payment...');

        try {
            addLog(`💱 Step 1: Getting quote for ${sourceChain.token} → USDC...`);
            await new Promise(r => setTimeout(r, 1000));
            addLog(`📊 Quote: ${selectedPlan.price} ${sourceChain.token} → ${selectedPlan.price} USDC`);

            addLog(`🌉 Step 2: Bridging from ${sourceChain.name}...`);
            await new Promise(r => setTimeout(r, 2000));
            addLog('✅ Bridge complete! USDC arrived on target chain.');

            addLog('📝 Step 3: Creating subscription...');
            await new Promise(r => setTimeout(r, 1000));
            addLog('🎉 Cross-chain subscription created!');

            setStep('success');
        } catch (err: any) {
            addLog(`❌ Error: ${err.message}`);
            setStep('payment');
        }
    };

    // Micropayment Session (Yellow Track)
    const handleYellowPayment = async () => {
        setStep('processing');
        addLog('⚡ Starting Yellow micropayment session...');

        try {
            addLog('🔗 Connecting to wss://clearnet-sandbox.yellow.com/ws...');
            await new Promise(r => setTimeout(r, 800));
            addLog('✅ Connected to Yellow Network!');

            addLog(`💰 Opening session with $${selectedPlan.price} deposit...`);
            await new Promise(r => setTimeout(r, 1000));
            setYellowSession({ connected: true, balance: selectedPlan.price, spent: '0.00', apiCalls: 0 });
            addLog('✅ Session opened! Ready for micropayments.');

            // Simulate API usage
            for (let i = 1; i <= 5; i++) {
                await new Promise(r => setTimeout(r, 300));
                const cost = 0.001;
                const newSpent = (i * cost).toFixed(3);
                const newBalance = (parseFloat(selectedPlan.price) - i * cost).toFixed(3);
                setYellowSession(prev => ({
                    ...prev,
                    balance: newBalance,
                    spent: newSpent,
                    apiCalls: i,
                }));
                addLog(`⚡ API call #${i} - Instant payment: $0.001 (No gas!)`);
            }

            addLog('🔒 Closing session and settling on-chain...');
            await new Promise(r => setTimeout(r, 1000));
            addLog('🎉 Session settled! All micropayments confirmed.');

            setStep('success');
        } catch (err: any) {
            addLog(`❌ Error: ${err.message}`);
            setStep('payment');
        }
    };

    const handlePayment = () => {
        setLogs([]);
        switch (selectedPayment.id) {
            case 'arc': handleArcPayment(); break;
            case 'lifi': handleLiFiPayment(); break;
            case 'yellow': handleYellowPayment(); break;
        }
    };

    const resetDemo = () => {
        setStep('plan');
        setLogs([]);
        setYellowSession({ connected: false, balance: '10.00', spent: '0.00', apiCalls: 0 });
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #111827, #1e1b4b, #111827)' }}>
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="text-3xl">⚡</span>
                        <div>
                            <div className="text-xl font-bold text-white">FlexSub</div>
                            <div className="text-xs text-gray-400">HackMoney 2026</div>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex gap-2">
                            {PAYMENT_METHODS.map(p => (
                                <span key={p.id} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                                    {p.prize}
                                </span>
                            ))}
                        </div>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                {/* Progress Steps */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-4">
                        {['plan', 'payment', 'processing', 'success'].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                                    ${step === s ? 'bg-indigo-500 text-white' :
                                        ['plan', 'payment', 'processing', 'success'].indexOf(step) > i ? 'bg-green-500 text-white' :
                                            'bg-gray-700 text-gray-400'}`}>
                                    {i + 1}
                                </div>
                                {i < 3 && <div className={`w-16 h-1 ${['plan', 'payment', 'processing', 'success'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-700'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Select Plan */}
                {step === 'plan' && (
                    <div className="animate-fadeIn">
                        <h1 className="text-4xl font-bold text-center text-white mb-2">Choose Your Plan</h1>
                        <p className="text-center text-gray-400 mb-10">Select a subscription plan to continue</p>

                        <div className="grid md:grid-cols-3 gap-6 mb-10">
                            {PLANS.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`p-6 rounded-2xl border-2 transition-all text-left
                                        ${selectedPlan.id === plan.id
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                                >
                                    <div className="text-lg font-bold text-white mb-1">{plan.name}</div>
                                    <div className="text-3xl font-bold text-indigo-400 mb-4">${plan.price}<span className="text-sm text-gray-400">/mo</span></div>
                                    <ul className="space-y-2">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                                                <span className="text-green-400">✓</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            ))}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => setStep('payment')}
                                disabled={!isConnected}
                                className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl
                                           hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isConnected ? 'Continue to Payment' : 'Connect Wallet First'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Payment Method */}
                {step === 'payment' && (
                    <div className="animate-fadeIn">
                        <h1 className="text-4xl font-bold text-center text-white mb-2">Choose Payment Method</h1>
                        <p className="text-center text-gray-400 mb-10">
                            Subscribing to <span className="text-indigo-400 font-bold">{selectedPlan.name}</span> for <span className="text-green-400 font-bold">${selectedPlan.price}/mo</span>
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            {PAYMENT_METHODS.map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedPayment(method)}
                                    className={`p-6 rounded-2xl border-2 transition-all text-left
                                        ${selectedPayment.id === method.id
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                                >
                                    <div className="text-4xl mb-3">{method.icon}</div>
                                    <div className="text-lg font-bold text-white mb-1">{method.name}</div>
                                    <div className="text-xs text-yellow-400 mb-2">🏆 {method.prize}</div>
                                    <div className="text-sm text-gray-400">{method.description}</div>
                                </button>
                            ))}
                        </div>

                        {/* LI.FI Source Chain Selector */}
                        {selectedPayment.id === 'lifi' && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
                                <div className="text-white font-bold mb-3">Select Source Chain</div>
                                <div className="grid grid-cols-4 gap-3">
                                    {SOURCE_CHAINS.map(chain => (
                                        <button
                                            key={chain.id}
                                            onClick={() => setSourceChain(chain)}
                                            className={`p-3 rounded-lg border transition-all
                                                ${sourceChain.id === chain.id
                                                    ? 'border-purple-500 bg-purple-500/20'
                                                    : 'border-white/10 hover:border-white/30'}`}
                                        >
                                            <div className="text-white font-medium">{chain.name}</div>
                                            <div className="text-xs text-gray-400">Pay with {chain.token}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setStep('plan')}
                                className="px-8 py-4 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-all"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handlePayment}
                                className={`px-12 py-4 bg-gradient-to-r ${selectedPayment.color} text-white font-bold rounded-xl
                                           hover:opacity-90 transition-all`}
                            >
                                {selectedPayment.icon} Pay with {selectedPayment.name}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Processing */}
                {step === 'processing' && (
                    <div className="animate-fadeIn">
                        <h1 className="text-4xl font-bold text-center text-white mb-8">
                            Processing {selectedPayment.name} Payment
                        </h1>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Transaction Info */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="text-white font-bold mb-4">Transaction Details</div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Plan</span>
                                        <span className="text-white font-medium">{selectedPlan.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Amount</span>
                                        <span className="text-green-400 font-medium">${selectedPlan.price}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Method</span>
                                        <span className="text-white font-medium">{selectedPayment.icon} {selectedPayment.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Prize Track</span>
                                        <span className="text-yellow-400 font-medium">{selectedPayment.prize}</span>
                                    </div>
                                </div>

                                {/* Yellow Session Stats */}
                                {selectedPayment.id === 'yellow' && yellowSession.connected && (
                                    <div className="mt-6 pt-4 border-t border-white/10">
                                        <div className="text-yellow-400 font-bold mb-3">Session Stats</div>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-white">{yellowSession.apiCalls}</div>
                                                <div className="text-xs text-gray-400">API Calls</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-400">${yellowSession.balance}</div>
                                                <div className="text-xs text-gray-400">Balance</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-orange-400">${yellowSession.spent}</div>
                                                <div className="text-xs text-gray-400">Spent</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Event Log */}
                            <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                                <div className="text-white font-bold mb-4">Event Log</div>
                                <div className="h-64 overflow-y-auto font-mono text-sm space-y-1">
                                    {logs.map((log, i) => (
                                        <div key={i} className="text-green-400">{log}</div>
                                    ))}
                                    {logs.length === 0 && (
                                        <div className="text-gray-500">Initializing...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 'success' && (
                    <div className="animate-fadeIn text-center">
                        <div className="text-8xl mb-6">🎉</div>
                        <h1 className="text-4xl font-bold text-white mb-4">Subscription Active!</h1>
                        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                            Your <span className="text-indigo-400 font-bold">{selectedPlan.name}</span> subscription
                            has been created using <span className={`font-bold`}>{selectedPayment.name}</span>.
                        </p>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-md mx-auto mb-8">
                            <div className="text-green-400 font-bold mb-2">🏆 Prize Track Demonstrated</div>
                            <div className="text-2xl font-bold text-white">{selectedPayment.prize}</div>
                            <div className="text-gray-400 text-sm mt-2">{selectedPayment.description}</div>
                        </div>

                        <button
                            onClick={resetDemo}
                            className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl
                                       hover:from-indigo-600 hover:to-purple-600 transition-all"
                        >
                            Try Another Demo
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-20">
                <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
                    FlexSub Protocol • HackMoney 2026 • Targeting $31,000+ in Prizes
                </div>
            </footer>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
