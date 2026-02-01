'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import Link from 'next/link';
import styles from './dashboard.module.css';
import { FLEXSUB_CONFIG } from '../providers';

// FlexSubManager ABI
const FLEXSUB_ABI = [
    {
        name: 'getSubscriberSubscriptions',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'subscriber', type: 'address' }],
        outputs: [{ name: '', type: 'uint256[]' }],
    },
    {
        name: 'getSubscription',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'planId', type: 'uint256' },
                    { name: 'subscriber', type: 'address' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'lastChargeTime', type: 'uint256' },
                    { name: 'totalCharged', type: 'uint256' },
                    { name: 'isActive', type: 'bool' },
                ],
            },
        ],
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
        name: 'cancelSubscription',
        type: 'function',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: [],
    },
] as const;

interface SubscriptionWithPlan {
    id: bigint;
    planId: bigint;
    planName: string;
    pricePerPeriod: bigint;
    startTime: bigint;
    lastChargeTime: bigint;
    totalCharged: bigint;
    isActive: boolean;
    merchant: string;
}

export default function Dashboard() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [subscriptions, setSubscriptions] = useState<SubscriptionWithPlan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cancellingId, setCancellingId] = useState<bigint | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load user's subscriptions
    const loadSubscriptions = useCallback(async () => {
        if (!publicClient || !address) return;

        setIsLoading(true);
        try {
            // Get subscription IDs for user
            const subIds = await publicClient.readContract({
                address: FLEXSUB_CONFIG.contractAddress,
                abi: FLEXSUB_ABI,
                functionName: 'getSubscriberSubscriptions',
                args: [address],
            }) as bigint[];

            const subs: SubscriptionWithPlan[] = [];

            for (const subId of subIds) {
                // Get subscription details
                const sub = await publicClient.readContract({
                    address: FLEXSUB_CONFIG.contractAddress,
                    abi: FLEXSUB_ABI,
                    functionName: 'getSubscription',
                    args: [subId],
                }) as {
                    planId: bigint;
                    subscriber: string;
                    startTime: bigint;
                    lastChargeTime: bigint;
                    totalCharged: bigint;
                    isActive: boolean;
                };

                // Get plan details
                const plan = await publicClient.readContract({
                    address: FLEXSUB_CONFIG.contractAddress,
                    abi: FLEXSUB_ABI,
                    functionName: 'getPlan',
                    args: [sub.planId],
                }) as {
                    merchant: string;
                    pricePerPeriod: bigint;
                    periodDuration: bigint;
                    name: string;
                    isActive: boolean;
                    totalSubscribers: bigint;
                };

                subs.push({
                    id: subId,
                    planId: sub.planId,
                    planName: plan.name,
                    pricePerPeriod: plan.pricePerPeriod,
                    startTime: sub.startTime,
                    lastChargeTime: sub.lastChargeTime,
                    totalCharged: sub.totalCharged,
                    isActive: sub.isActive,
                    merchant: plan.merchant,
                });
            }

            setSubscriptions(subs);
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, address]);

    useEffect(() => {
        if (isConnected) {
            loadSubscriptions();
        }
    }, [isConnected, loadSubscriptions]);

    // Cancel subscription
    const handleCancel = async (subId: bigint) => {
        if (!walletClient) return;

        setCancellingId(subId);
        setMessage(null);

        try {
            const hash = await walletClient.writeContract({
                address: FLEXSUB_CONFIG.contractAddress,
                abi: FLEXSUB_ABI,
                functionName: 'cancelSubscription',
                args: [subId],
            });

            await publicClient?.waitForTransactionReceipt({ hash });
            setMessage({ type: 'success', text: `Subscription #${subId} cancelled successfully!` });
            await loadSubscriptions();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to cancel subscription' });
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (timestamp: bigint) => {
        return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.backLink}>← Back</Link>
                    <h1 className={styles.title}>My Subscriptions</h1>
                </div>
                <ConnectButton />
            </header>

            {!isConnected ? (
                <div className={styles.connectPrompt}>
                    <h2>Connect Your Wallet</h2>
                    <p>Connect your wallet to view your subscriptions</p>
                    <ConnectButton />
                </div>
            ) : (
                <div className={styles.content}>
                    {message && (
                        <div className={`${styles.message} ${styles[message.type]}`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    <div className={styles.stats}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{subscriptions.length}</span>
                            <span className={styles.statLabel}>Total Subscriptions</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>
                                {subscriptions.filter(s => s.isActive).length}
                            </span>
                            <span className={styles.statLabel}>Active</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>
                                ${formatUnits(
                                    subscriptions.reduce((sum, s) => sum + s.totalCharged, 0n),
                                    6
                                )}
                            </span>
                            <span className={styles.statLabel}>Total Paid</span>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading subscriptions...</p>
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon}>📭</span>
                            <h3>No Subscriptions Yet</h3>
                            <p>You haven't subscribed to any plans yet.</p>
                            <Link href="/" className={styles.browseLink}>
                                Browse Plans →
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.subscriptionList}>
                            {subscriptions.map((sub) => (
                                <div
                                    key={sub.id.toString()}
                                    className={`${styles.subscriptionCard} ${!sub.isActive ? styles.inactive : ''}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <h3>{sub.planName}</h3>
                                        <span className={`${styles.statusBadge} ${sub.isActive ? styles.active : styles.cancelled}`}>
                                            {sub.isActive ? '✓ Active' : '✗ Cancelled'}
                                        </span>
                                    </div>

                                    <div className={styles.cardDetails}>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Subscription ID</span>
                                            <span className={styles.value}>#{sub.id.toString()}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Price</span>
                                            <span className={styles.value}>
                                                ${formatUnits(sub.pricePerPeriod, 6)} USDC/month
                                            </span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Started</span>
                                            <span className={styles.value}>{formatDate(sub.startTime)}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Last Charged</span>
                                            <span className={styles.value}>{formatDate(sub.lastChargeTime)}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Total Paid</span>
                                            <span className={styles.value}>
                                                ${formatUnits(sub.totalCharged, 6)} USDC
                                            </span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>Merchant</span>
                                            <span className={styles.value} title={sub.merchant}>
                                                {sub.merchant.slice(0, 6)}...{sub.merchant.slice(-4)}
                                            </span>
                                        </div>
                                    </div>

                                    {sub.isActive && (
                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.cancelButton}
                                                onClick={() => handleCancel(sub.id)}
                                                disabled={cancellingId === sub.id}
                                            >
                                                {cancellingId === sub.id ? (
                                                    <>
                                                        <span className={styles.buttonSpinner}></span>
                                                        Cancelling...
                                                    </>
                                                ) : (
                                                    '🚫 Cancel Subscription'
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
