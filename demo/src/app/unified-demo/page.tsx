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
 * Complete subscription payment experience:
 * - Direct USDC payments via Arc
 * - Cross-chain payments via LI.FI
 * - Off-chain micropayments via Yellow Network
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

// Payment methods
const PAYMENT_METHODS = [
    {
        id: 'arc',
        name: 'Direct USDC',
        icon: '💳',
        badge: 'Powered by Arc',
        description: 'Pay directly with USDC on this chain',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'lifi',
        name: 'Cross-Chain',
        icon: '🔗',
        badge: 'Powered by LI.FI',
        description: 'Pay from any chain with any token',
        color: 'from-purple-500 to-pink-500',
    },
    {
        id: 'yellow',
        name: 'Micropayment',
        icon: '⚡',
        badge: 'Powered by Yellow',
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
                            <div className="text-xs text-gray-400">Subscription Protocol</div>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex gap-2">
                            {PAYMENT_METHODS.map(p => (
                                <span key={p.id} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                                    {p.badge}
                                </span>
                            ))}
                        </div>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '3rem 1.5rem 6rem 1.5rem' }}>
                {/* Progress Steps */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {['plan', 'payment', 'processing', 'success'].map((s, i) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    background: step === s ? '#6366F1' :
                                        ['plan', 'payment', 'processing', 'success'].indexOf(step) > i ? '#22C55E' : '#374151',
                                    color: step === s || ['plan', 'payment', 'processing', 'success'].indexOf(step) > i ? 'white' : '#9CA3AF'
                                }}>
                                    {i + 1}
                                </div>
                                {i < 3 && (
                                    <div style={{
                                        width: '4rem',
                                        height: '4px',
                                        background: ['plan', 'payment', 'processing', 'success'].indexOf(step) > i ? '#22C55E' : '#374151'
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Select Plan */}
                {step === 'plan' && (
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', textAlign: 'center', color: 'white', marginBottom: '0.5rem' }}>Choose Your Plan</h1>
                        <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '2.5rem' }}>Select a subscription plan to continue</p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            {PLANS.map(plan => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '1rem',
                                        border: selectedPlan.id === plan.id ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)',
                                        background: selectedPlan.id === plan.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{plan.name}</div>
                                    <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#818CF8', marginBottom: '1rem' }}>
                                        ${plan.price}<span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>/mo</span>
                                    </div>
                                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {plan.features.map((f, i) => (
                                            <li key={i} style={{ fontSize: '0.875rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ color: '#22C55E' }}>✓</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={() => setStep('payment')}
                                disabled={!isConnected}
                                style={{
                                    padding: '1rem 3rem',
                                    background: 'linear-gradient(to right, #6366F1, #8B5CF6)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    cursor: isConnected ? 'pointer' : 'not-allowed',
                                    opacity: isConnected ? 1 : 0.5
                                }}
                            >
                                {isConnected ? 'Continue to Payment' : 'Connect Wallet First'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Payment Method */}
                {step === 'payment' && (
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', textAlign: 'center', color: 'white', marginBottom: '0.5rem' }}>
                            Choose Payment Method
                        </h1>
                        <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '2.5rem' }}>
                            Subscribing to <span style={{ color: '#818CF8', fontWeight: 'bold' }}>{selectedPlan.name}</span> for <span style={{ color: '#22C55E', fontWeight: 'bold' }}>${selectedPlan.price}/mo</span>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                            {PAYMENT_METHODS.map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedPayment(method)}
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '1rem',
                                        border: selectedPayment.id === method.id ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)',
                                        background: selectedPayment.id === method.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        minHeight: '180px'
                                    }}
                                >
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{method.icon}</div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{method.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#60A5FA', marginBottom: '0.5rem' }}>{method.badge}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>{method.description}</div>
                                </button>
                            ))}
                        </div>

                        {/* LI.FI Source Chain Selector */}
                        {selectedPayment.id === 'lifi' && (
                            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.75rem' }}>Select Source Chain</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                    {SOURCE_CHAINS.map(chain => (
                                        <button
                                            key={chain.id}
                                            onClick={() => setSourceChain(chain)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: sourceChain.id === chain.id ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
                                                background: sourceChain.id === chain.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ color: 'white', fontWeight: 500 }}>{chain.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Pay with {chain.token}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button
                                onClick={() => setStep('plan')}
                                style={{
                                    padding: '1rem 2rem',
                                    background: '#374151',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handlePayment}
                                style={{
                                    padding: '1rem 3rem',
                                    background: selectedPayment.id === 'arc' ? 'linear-gradient(to right, #3B82F6, #06B6D4)' :
                                        selectedPayment.id === 'lifi' ? 'linear-gradient(to right, #8B5CF6, #EC4899)' :
                                            'linear-gradient(to right, #EAB308, #F97316)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
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
                                        <span className="text-gray-400">Provider</span>
                                        <span className="text-blue-400 font-medium">{selectedPayment.badge}</span>
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
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🎉</div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Subscription Active!</h1>
                        <p style={{ color: '#9CA3AF', marginBottom: '2rem', maxWidth: '32rem', margin: '0 auto 2rem auto' }}>
                            Your <span style={{ color: '#818CF8', fontWeight: 'bold' }}>{selectedPlan.name}</span> subscription
                            has been created using <span style={{ fontWeight: 'bold' }}>{selectedPayment.name}</span>.
                        </p>

                        <div style={{
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            maxWidth: '28rem',
                            margin: '0 auto 2rem auto'
                        }}>
                            <div style={{ color: '#22C55E', fontWeight: 'bold', marginBottom: '0.5rem' }}>✅ Payment Method Used</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{selectedPayment.name}</div>
                            <div style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.5rem' }}>{selectedPayment.description}</div>
                        </div>

                        <button
                            onClick={resetDemo}
                            style={{
                                padding: '1rem 3rem',
                                background: 'linear-gradient(to right, #6366F1, #8B5CF6)',
                                color: 'white',
                                fontWeight: 'bold',
                                borderRadius: '0.75rem',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Try Another Demo
                        </button>
                    </div>
                )}
            </main>

            {/* Footer - Fixed at bottom */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(17,24,39,0.95)',
                backdropFilter: 'blur(8px)',
                padding: '1rem',
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '0.875rem',
                zIndex: 50
            }}>
                FlexSub Protocol • Flexible Subscription Payments • Built with Arc, LI.FI & Yellow
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

