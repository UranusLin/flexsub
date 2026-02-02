'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { formatEther, formatUnits } from 'viem';

/**
 * Local Block Explorer
 * Similar to Scaffold-ETH 2's block explorer for debugging local Anvil transactions
 */

type Block = {
    number: bigint;
    hash: `0x${string}` | null;
    timestamp: bigint;
    transactions: `0x${string}`[];
    gasUsed: bigint;
};

type Transaction = {
    hash: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}` | null;
    value: bigint;
    blockNumber: bigint | null;
    input: `0x${string}`;
    gas: bigint;
};

type TransactionReceipt = {
    status: 'success' | 'reverted';
    gasUsed: bigint;
    logs: readonly { address: `0x${string}`; topics: readonly `0x${string}`[]; data: `0x${string}` }[];
};

export default function ExplorerPage() {
    const publicClient = usePublicClient();
    const chainId = useChainId();

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [txReceipt, setTxReceipt] = useState<TransactionReceipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch recent blocks
    const fetchBlocks = async () => {
        if (!publicClient) return;

        try {
            const blockNumber = await publicClient.getBlockNumber();
            const blocksToFetch = 10;
            const startBlock = blockNumber > BigInt(blocksToFetch) ? blockNumber - BigInt(blocksToFetch) : BigInt(0);

            const blockPromises = [];
            for (let i = blockNumber; i > startBlock; i--) {
                blockPromises.push(publicClient.getBlock({ blockNumber: i }));
            }

            const fetchedBlocks = await Promise.all(blockPromises);
            setBlocks(fetchedBlocks as Block[]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching blocks:', error);
            setLoading(false);
        }
    };

    // Fetch transaction details
    const fetchTransaction = async (hash: `0x${string}`) => {
        if (!publicClient) return;

        try {
            const tx = await publicClient.getTransaction({ hash });
            const receipt = await publicClient.getTransactionReceipt({ hash });
            setSelectedTx(tx as Transaction);
            setTxReceipt(receipt as TransactionReceipt);
        } catch (error) {
            console.error('Error fetching transaction:', error);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, [publicClient]);

    // Auto-refresh every 2 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchBlocks, 2000);
        return () => clearInterval(interval);
    }, [autoRefresh, publicClient]);

    const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const shortenHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #111827, #1e1b4b, #111827)' }}>
            {/* Header */}
            <header style={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(17,24,39,0.8)'
            }}>
                <div style={{
                    maxWidth: '72rem',
                    margin: '0 auto',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                        <span style={{ fontSize: '1.875rem' }}>🔍</span>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Block Explorer</div>
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Chain ID: {chainId}</div>
                        </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: autoRefresh ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
                                border: autoRefresh ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '0.5rem',
                                color: autoRefresh ? '#22C55E' : '#9CA3AF',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            {autoRefresh ? '🔄 Auto Refresh ON' : '⏸️ Auto Refresh OFF'}
                        </button>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: selectedTx ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
                    {/* Blocks & Transactions List */}
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                            Recent Blocks
                        </h2>

                        {loading ? (
                            <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>
                                Loading blocks...
                            </div>
                        ) : blocks.length === 0 ? (
                            <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>
                                No blocks found. Make sure Anvil is running.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {blocks.map((block) => (
                                    <div
                                        key={block.number.toString()}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '0.75rem',
                                            padding: '1rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.25rem' }}>📦</span>
                                                <span style={{ color: '#60A5FA', fontWeight: 'bold' }}>
                                                    Block #{block.number.toString()}
                                                </span>
                                            </div>
                                            <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                                {new Date(Number(block.timestamp) * 1000).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                                            Hash: {block.hash ? shortenHash(block.hash) : 'N/A'} | Gas Used: {block.gasUsed.toString()}
                                        </div>

                                        {block.transactions.length > 0 ? (
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                                                    Transactions ({block.transactions.length}):
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {block.transactions.slice(0, 5).map((txHash) => (
                                                        <button
                                                            key={txHash}
                                                            onClick={() => fetchTransaction(txHash)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                padding: '0.5rem 0.75rem',
                                                                background: selectedTx?.hash === txHash ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                                                border: selectedTx?.hash === txHash ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '0.5rem',
                                                                cursor: 'pointer',
                                                                width: '100%',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <span style={{ color: '#818CF8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                                {shortenHash(txHash)}
                                                            </span>
                                                            <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>→ Click to view</span>
                                                        </button>
                                                    ))}
                                                    {block.transactions.length > 5 && (
                                                        <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                                                            +{block.transactions.length - 5} more transactions
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#6B7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                No transactions in this block
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transaction Details Panel */}
                    {selectedTx && (
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            position: 'sticky',
                            top: '5rem',
                            height: 'fit-content'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                                    Transaction Details
                                </h3>
                                <button
                                    onClick={() => { setSelectedTx(null); setTxReceipt(null); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '0.25rem',
                                        color: '#9CA3AF',
                                        cursor: 'pointer',
                                        padding: '0.25rem 0.5rem'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Status Badge */}
                            {txReceipt && (
                                <div style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    marginBottom: '1rem',
                                    background: txReceipt.status === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                    color: txReceipt.status === 'success' ? '#22C55E' : '#EF4444',
                                    border: txReceipt.status === 'success' ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(239,68,68,0.5)'
                                }}>
                                    {txReceipt.status === 'success' ? '✓ Success' : '✗ Reverted'}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* Hash */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Transaction Hash</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#818CF8', wordBreak: 'break-all' }}>
                                        {selectedTx.hash}
                                    </div>
                                </div>

                                {/* From */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>From</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#60A5FA' }}>
                                        {selectedTx.from}
                                    </div>
                                </div>

                                {/* To */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>To</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#22C55E' }}>
                                        {selectedTx.to || 'Contract Creation'}
                                    </div>
                                </div>

                                {/* Value */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Value</div>
                                    <div style={{ fontSize: '1rem', color: 'white', fontWeight: 'bold' }}>
                                        {formatEther(selectedTx.value)} ETH
                                    </div>
                                </div>

                                {/* Gas */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Gas Limit</div>
                                        <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                                            {selectedTx.gas.toString()}
                                        </div>
                                    </div>
                                    {txReceipt && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Gas Used</div>
                                            <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                                                {txReceipt.gasUsed.toString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Block */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Block Number</div>
                                    <div style={{ fontSize: '0.875rem', color: '#FBBF24' }}>
                                        {selectedTx.blockNumber?.toString() || 'Pending'}
                                    </div>
                                </div>

                                {/* Input Data */}
                                {selectedTx.input && selectedTx.input !== '0x' && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Input Data</div>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.625rem',
                                            color: '#9CA3AF',
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '0.5rem',
                                            borderRadius: '0.25rem',
                                            wordBreak: 'break-all',
                                            maxHeight: '100px',
                                            overflow: 'auto'
                                        }}>
                                            {selectedTx.input}
                                        </div>
                                    </div>
                                )}

                                {/* Logs */}
                                {txReceipt && txReceipt.logs.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                                            Events ({txReceipt.logs.length})
                                        </div>
                                        <div style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '0.5rem',
                                            borderRadius: '0.25rem',
                                            maxHeight: '150px',
                                            overflow: 'auto'
                                        }}>
                                            {txReceipt.logs.map((log, i) => (
                                                <div key={i} style={{
                                                    fontSize: '0.625rem',
                                                    color: '#9CA3AF',
                                                    padding: '0.25rem 0',
                                                    borderBottom: i < txReceipt.logs.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                                                }}>
                                                    <div style={{ color: '#818CF8' }}>Contract: {shortenAddress(log.address)}</div>
                                                    <div>Topic[0]: {log.topics[0] ? shortenHash(log.topics[0]) : 'N/A'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(17,24,39,0.95)',
                backdropFilter: 'blur(8px)',
                padding: '0.75rem',
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '0.75rem',
                zIndex: 50
            }}>
                <Link href="/unified-demo" style={{ color: '#818CF8', textDecoration: 'none', marginRight: '1rem' }}>
                    ← Back to Demo
                </Link>
                |
                <Link href="/debug" style={{ color: '#818CF8', textDecoration: 'none', marginLeft: '1rem' }}>
                    Debug Console →
                </Link>
            </footer>
        </div>
    );
}
