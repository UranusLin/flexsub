'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import styles from './page.module.css';
import { FLEXSUB_CONFIG } from './providers';

// FlexSubManager ABI (matching the SDK)
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
        name: 'getPlan',
        type: 'function',
        stateMutability: 'view',
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
        name: 'nextPlanId',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Demo plan structure
interface Plan {
    id: bigint;
    name: string;
    price: string;
    period: string;
    features: string[];
    onChain: boolean;
}

// Initial demo plans (will be replaced by on-chain data)
const INITIAL_PLANS: Plan[] = [
    {
        id: 1n,
        name: 'Starter',
        price: '4.99',
        period: 'monthly',
        features: ['Basic access', '10 API calls/day', 'Email support'],
        onChain: false,
    },
    {
        id: 2n,
        name: 'Pro',
        price: '19.99',
        period: 'monthly',
        features: ['Full access', 'Unlimited API calls', 'Priority support', 'Custom integrations'],
        onChain: false,
    },
    {
        id: 3n,
        name: 'Enterprise',
        price: '99.99',
        period: 'monthly',
        features: ['Everything in Pro', 'Dedicated account manager', 'SLA guarantee', 'On-premise deployment'],
        onChain: false,
    },
];

const SUPPORTED_CHAINS = [
    { id: 31337, name: 'Anvil Local', icon: '🔨' },
    { id: 42161, name: 'Arbitrum', icon: '🔵' },
    { id: 10, name: 'Optimism', icon: '🔴' },
    { id: 8453, name: 'Base', icon: '🔷' },
];

type FlowStep = 'idle' | 'connecting' | 'creating-plan' | 'subscribing' | 'success' | 'error';

export default function Home() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]); // Default Anvil
    const [flowStep, setFlowStep] = useState<FlowStep>('idle');
    const [txHash, setTxHash] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
        console.log(message);
    }, []);

    // Load on-chain plans
    const loadPlans = useCallback(async () => {
        if (!publicClient) return;

        try {
            addLog('📖 Loading plans from contract...');
            const nextPlanId = await publicClient.readContract({
                address: FLEXSUB_CONFIG.contractAddress,
                abi: FLEXSUB_ABI,
                functionName: 'nextPlanId',
            });

            const onChainPlans: Plan[] = [];
            for (let i = 1n; i < nextPlanId; i++) {
                try {
                    const planData = await publicClient.readContract({
                        address: FLEXSUB_CONFIG.contractAddress,
                        abi: FLEXSUB_ABI,
                        functionName: 'getPlan',
                        args: [i],
                    }) as { merchant: string; pricePerPeriod: bigint; periodDuration: bigint; name: string; isActive: boolean; totalSubscribers: bigint };

                    if (planData.isActive) {
                        onChainPlans.push({
                            id: i,
                            name: planData.name,
                            price: formatUnits(planData.pricePerPeriod, 6),
                            period: planData.periodDuration === 2592000n ? 'monthly' : 'custom',
                            features: ['On-chain subscription', `${planData.totalSubscribers.toString()} subscribers`],
                            onChain: true,
                        });
                    }
                } catch {
                    // Plan doesn't exist, skip
                }
            }

            if (onChainPlans.length > 0) {
                setPlans(onChainPlans);
                addLog(`✅ Loaded ${onChainPlans.length} on-chain plans`);
            } else {
                addLog('ℹ️ No on-chain plans found, showing demo plans');
            }
        } catch (err) {
            addLog('⚠️ Could not load plans from contract');
            console.error(err);
        }
    }, [publicClient, addLog]);

    useEffect(() => {
        if (isConnected && publicClient) {
            loadPlans();
        }
    }, [isConnected, publicClient, loadPlans]);

    // Create a plan on-chain (merchant function)
    const handleCreatePlan = async () => {
        if (!walletClient || !selectedPlan) return;

        setFlowStep('creating-plan');
        setError('');

        try {
            addLog(`📝 Creating plan "${selectedPlan.name}" on-chain...`);

            const priceInUnits = parseUnits(selectedPlan.price, 6);
            const periodDuration = 2592000n; // 30 days in seconds

            const hash = await walletClient.writeContract({
                address: FLEXSUB_CONFIG.contractAddress,
                abi: FLEXSUB_ABI,
                functionName: 'createPlan',
                args: [priceInUnits, periodDuration, selectedPlan.name],
            });

            setTxHash(hash);
            addLog(`⏳ Transaction sent: ${hash.slice(0, 10)}...`);

            // Wait for confirmation
            await publicClient?.waitForTransactionReceipt({ hash });
            addLog(`✅ Plan created successfully!`);

            // Reload plans
            await loadPlans();
            setFlowStep('success');
        } catch (err: any) {
            setError(err.message || 'Failed to create plan');
            addLog(`❌ Error: ${err.message}`);
            setFlowStep('error');
        }
    };

    // Subscribe to a plan on-chain
    const handleSubscribe = async () => {
        if (!walletClient || !selectedPlan) return;

        setFlowStep('subscribing');
        setError('');

        try {
            // Step 1: Log the flow
            addLog('🌐 Step 1: LI.FI cross-chain deposit (simulated for local)');
            await new Promise(r => setTimeout(r, 1000));

            addLog('⚡ Step 2: Yellow state channel setup (simulated for local)');
            await new Promise(r => setTimeout(r, 1000));

            // Step 3: Actual on-chain subscription
            addLog(`📝 Step 3: Subscribing to plan #${selectedPlan.id} on-chain...`);

            const hash = await walletClient.writeContract({
                address: FLEXSUB_CONFIG.contractAddress,
                abi: FLEXSUB_ABI,
                functionName: 'subscribe',
                args: [selectedPlan.id],
            });

            setTxHash(hash);
            addLog(`⏳ Transaction sent: ${hash.slice(0, 10)}...`);

            // Wait for confirmation
            await publicClient?.waitForTransactionReceipt({ hash });
            addLog(`✅ Subscription confirmed on-chain!`);

            setFlowStep('success');
        } catch (err: any) {
            setError(err.message || 'Failed to subscribe');
            addLog(`❌ Error: ${err.message}`);
            setFlowStep('error');
        }
    };

    const resetFlow = () => {
        setFlowStep('idle');
        setTxHash('');
        setError('');
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <h1 className={styles.logo}>
                    <span className={styles.logoIcon}>⚡</span>
                    FlexSub
                </h1>
                <p className={styles.tagline}>Cross-chain Instant Subscription Protocol</p>
                <div style={{ marginTop: '1rem' }}>
                    <ConnectButton />
                </div>
            </header>

            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h2>Subscribe from any chain.</h2>
                    <h2>Pay instantly. Settle in USDC.</h2>
                    <div className={styles.badges}>
                        <span className={styles.badge}>LI.FI</span>
                        <span className={styles.badge}>Yellow</span>
                        <span className={styles.badge}>Arc</span>
                        {isConnected && <span className={styles.badge} style={{ background: '#22c55e' }}>🔗 Connected</span>}
                    </div>
                </div>
            </section>

            {!isConnected ? (
                <section className={styles.checkout}>
                    <h3>Connect Wallet to Get Started</h3>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Connect your wallet to view plans and subscribe
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ConnectButton />
                    </div>
                </section>
            ) : (
                <>
                    <section className={styles.plans}>
                        <h3>Choose Your Plan {plans.some(p => p.onChain) && '(On-Chain)'}</h3>
                        <div className={styles.planGrid}>
                            {plans.map((plan) => (
                                <div
                                    key={plan.id.toString()}
                                    className={`${styles.planCard} ${selectedPlan?.id === plan.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedPlan(plan)}
                                >
                                    <h4>{plan.name}</h4>
                                    <div className={styles.price}>
                                        <span className={styles.currency}>$</span>
                                        <span className={styles.amount}>{plan.price}</span>
                                        <span className={styles.period}>/{plan.period}</span>
                                    </div>
                                    <ul className={styles.features}>
                                        {plan.features.map((feature, i) => (
                                            <li key={i}>✓ {feature}</li>
                                        ))}
                                    </ul>
                                    {plan.onChain && (
                                        <span className={styles.badge} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.7rem' }}>
                                            On-Chain ✓
                                        </span>
                                    )}
                                    {selectedPlan?.id === plan.id && (
                                        <div className={styles.selectedBadge}>Selected</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {selectedPlan && (
                        <section className={styles.checkout}>
                            <h3>Subscribe to {selectedPlan.name}</h3>

                            <div className={styles.chainSelector}>
                                {SUPPORTED_CHAINS.map((chain) => (
                                    <button
                                        key={chain.id}
                                        className={`${styles.chainButton} ${selectedChain.id === chain.id ? styles.activeChain : ''}`}
                                        onClick={() => setSelectedChain(chain)}
                                    >
                                        <span className={styles.chainIcon}>{chain.icon}</span>
                                        <span>{chain.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className={styles.summary}>
                                <div className={styles.summaryRow}>
                                    <span>Plan:</span>
                                    <span>{selectedPlan.name} {selectedPlan.onChain ? '(On-Chain)' : '(Demo)'}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Your Wallet:</span>
                                    <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Amount:</span>
                                    <span>${selectedPlan.price} USDC</span>
                                </div>
                            </div>

                            {flowStep === 'success' ? (
                                <div className={styles.successMessage}>
                                    <span className={styles.successIcon}>✅</span>
                                    <div>
                                        <h4>Transaction Confirmed!</h4>
                                        <p>
                                            {txHash && (
                                                <>TX: {txHash.slice(0, 10)}...{txHash.slice(-6)}</>
                                            )}
                                        </p>
                                        <button
                                            onClick={resetFlow}
                                            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}
                                        >
                                            Do Another Action
                                        </button>
                                    </div>
                                </div>
                            ) : flowStep === 'error' ? (
                                <div className={styles.successMessage} style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                                    <span className={styles.successIcon}>❌</span>
                                    <div>
                                        <h4 style={{ color: '#ef4444' }}>Transaction Failed</h4>
                                        <p style={{ fontSize: '0.8rem' }}>{error}</p>
                                        <button
                                            onClick={resetFlow}
                                            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                    {!selectedPlan.onChain && (
                                        <button
                                            className={styles.subscribeButton}
                                            onClick={handleCreatePlan}
                                            disabled={flowStep !== 'idle'}
                                            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                                        >
                                            {flowStep === 'creating-plan' ? (
                                                <span className={styles.loading}>
                                                    <span className={styles.spinner}></span>
                                                    Creating Plan On-Chain...
                                                </span>
                                            ) : (
                                                <>🏪 Create This Plan (Merchant)</>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        className={styles.subscribeButton}
                                        onClick={handleSubscribe}
                                        disabled={flowStep !== 'idle' || !selectedPlan.onChain}
                                        title={!selectedPlan.onChain ? 'Create the plan first' : ''}
                                    >
                                        {flowStep === 'subscribing' ? (
                                            <span className={styles.loading}>
                                                <span className={styles.spinner}></span>
                                                Subscribing...
                                            </span>
                                        ) : (
                                            <>🔔 Subscribe Now{!selectedPlan.onChain && ' (Create Plan First)'}</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {(flowStep === 'creating-plan' || flowStep === 'subscribing') && (
                                <div className={styles.flowSteps}>
                                    <div className={`${styles.step} ${styles.active}`}>
                                        <span className={styles.stepIcon}>🌐</span>
                                        <span>LI.FI: Cross-chain deposit</span>
                                    </div>
                                    <div className={`${styles.step} ${flowStep === 'subscribing' ? styles.active : ''}`}>
                                        <span className={styles.stepIcon}>⚡</span>
                                        <span>Yellow: Open state channel</span>
                                    </div>
                                    <div className={styles.step}>
                                        <span className={styles.stepIcon}>💵</span>
                                        <span>Arc: Confirm on-chain</span>
                                    </div>
                                </div>
                            )}

                            {/* Activity Log */}
                            {logs.length > 0 && (
                                <div style={{ marginTop: '1.5rem', background: 'var(--bg-card)', borderRadius: '0.5rem', padding: '1rem', maxHeight: '150px', overflow: 'auto' }}>
                                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Activity Log</h4>
                                    {logs.slice(-5).map((log, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.25rem 0', fontFamily: 'monospace' }}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}

            <footer className={styles.footer}>
                <p>Built for HackMoney 2026 🏆</p>
                <p className={styles.prizes}>Yellow · Arc · LI.FI</p>
                <div>
                    <Link href="/dashboard" className={styles.dashboardLink}>
                        📋 My Subscriptions
                    </Link>
                    <Link href="/debug" className={styles.debugLink}>
                        🔧 Debug Console
                    </Link>
                </div>
            </footer>
        </main>
    );
}
