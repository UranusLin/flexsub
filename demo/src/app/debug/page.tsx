'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './debug.module.css';

// Contract ABI for FlexSubManager
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
        name: 'charge',
        type: 'function',
        inputs: [
            { name: 'subscriptionId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'cancelSubscription',
        type: 'function',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: [],
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
        name: 'nextPlanId',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'nextSubscriptionId',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'usdc',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
];

interface LogEntry {
    id: number;
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'tx';
    message: string;
    txHash?: string;
}

interface FunctionInput {
    name: string;
    type: string;
    value: string;
}

export default function DebugPage() {
    const [activeTab, setActiveTab] = useState<'contract' | 'lifi' | 'yellow' | 'arc'>('contract');
    const [contractAddress, setContractAddress] = useState('');
    const [selectedFunction, setSelectedFunction] = useState<any>(null);
    const [inputs, setInputs] = useState<FunctionInput[]>([]);
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [connected, setConnected] = useState(false);
    const [account, setAccount] = useState('');
    const [chainId, setChainId] = useState<number | null>(null);
    const [isFauceting, setIsFauceting] = useState(false);

    // LI.FI State
    const [lifiFromChain, setLifiFromChain] = useState('42161');
    const [lifiToChain, setLifiToChain] = useState('10');
    const [lifiFromToken, setLifiFromToken] = useState('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
    const [lifiAmount, setLifiAmount] = useState('10');
    const [lifiQuote, setLifiQuote] = useState<any>(null);

    // Yellow State
    const [yellowConnected, setYellowConnected] = useState(false);
    const [yellowChannel, setYellowChannel] = useState('');
    const [yellowPartner, setYellowPartner] = useState('');
    const [yellowAmount, setYellowAmount] = useState('1000000');

    // Arc State
    const [arcBalance, setArcBalance] = useState('0');
    const [arcRecipient, setArcRecipient] = useState('');
    const [arcAmount, setArcAmount] = useState('10');

    const addLog = (type: LogEntry['type'], message: string, txHash?: string) => {
        setLogs((prev) => [
            {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                type,
                message,
                txHash,
            },
            ...prev.slice(0, 49), // Keep last 50 logs
        ]);
    };

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({
                    method: 'eth_requestAccounts',
                });
                setAccount(accounts[0]);
                setConnected(true);

                // Get chain ID
                const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
                setChainId(parseInt(chainIdHex, 16));

                addLog('success', `Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
            } catch (error) {
                addLog('error', 'Failed to connect wallet');
            }
        } else {
            addLog('error', 'MetaMask not detected');
        }
    };

    // USDC Faucet - mint test USDC on Anvil
    const requestUsdcFaucet = async () => {
        if (!account || chainId !== 31337) {
            addLog('error', 'USDC Faucet only available on Anvil (chain 31337)');
            return;
        }

        setIsFauceting(true);
        addLog('info', 'Requesting USDC from MockUSDC faucet...');

        try {
            // MockUSDC address on Anvil (first deployed contract)
            const mockUsdcAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

            // Encode faucet() function call
            const faucetData = '0xde5f72fd'; // keccak256("faucet()")[:4]

            const txHash = await (window as any).ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: account,
                    to: mockUsdcAddress,
                    data: faucetData,
                }],
            });

            addLog('success', '💵 10,000 USDC minted to your account!', txHash);
        } catch (error: any) {
            addLog('error', `USDC Faucet failed: ${error.message}`);
        } finally {
            setIsFauceting(false);
        }
    };

    // ETH Faucet - Add ETH on Anvil
    const requestAnvilFaucet = async () => {
        if (!account || chainId !== 31337) {
            addLog('error', 'ETH Faucet only available on Anvil (chain 31337)');
            return;
        }

        setIsFauceting(true);
        addLog('info', 'Requesting ETH from Anvil...');

        try {
            const response = await fetch('http://127.0.0.1:8545', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'anvil_setBalance',
                    params: [account, '0x21E19E0C9BAB2400000'], // 10000 ETH in hex
                }),
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error.message);
            }

            addLog('success', '💰 10,000 ETH added to your account!');
        } catch (error: any) {
            addLog('error', `ETH Faucet failed: ${error.message}`);
        } finally {
            setIsFauceting(false);
        }
    };

    const handleFunctionSelect = (func: any) => {
        setSelectedFunction(func);
        setInputs(
            func.inputs.map((input: any) => ({
                name: input.name,
                type: input.type,
                value: '',
            }))
        );
        setResult('');
    };

    const handleInputChange = (index: number, value: string) => {
        setInputs((prev) =>
            prev.map((input, i) => (i === index ? { ...input, value } : input))
        );
    };

    const executeFunction = async () => {
        if (!selectedFunction || !contractAddress) return;
        setIsLoading(true);
        addLog('info', `Executing ${selectedFunction.name}...`);

        // Simulate execution
        setTimeout(() => {
            if (selectedFunction.stateMutability === 'view') {
                // Mock read result
                if (selectedFunction.name === 'getPlan') {
                    setResult(JSON.stringify({
                        merchant: '0x1234...5678',
                        pricePerPeriod: '9990000',
                        periodDuration: '2592000',
                        name: 'Pro Plan',
                        isActive: true,
                        totalSubscribers: '42',
                    }, null, 2));
                } else if (selectedFunction.name === 'nextPlanId') {
                    setResult('3');
                } else {
                    setResult('Mock result');
                }
                addLog('success', `${selectedFunction.name} completed`);
            } else {
                const mockTxHash = '0x' + 'a'.repeat(64);
                setResult(`Transaction sent: ${mockTxHash}`);
                addLog('tx', `${selectedFunction.name} tx submitted`, mockTxHash);
            }
            setIsLoading(false);
        }, 1500);
    };

    const getLifiQuote = async () => {
        setIsLoading(true);
        addLog('info', 'Getting LI.FI quote...');

        // Simulate LI.FI quote
        setTimeout(() => {
            setLifiQuote({
                fromAmount: lifiAmount + '000000',
                toAmount: (parseFloat(lifiAmount) * 0.98).toFixed(2) + '000000',
                estimatedTime: 120,
                route: 'Stargate Bridge → Optimism',
                fees: '$0.50',
            });
            addLog('success', 'Quote received from LI.FI');
            setIsLoading(false);
        }, 2000);
    };

    const connectYellow = async () => {
        addLog('info', 'Connecting to Yellow Network...');
        setTimeout(() => {
            setYellowConnected(true);
            addLog('success', 'Connected to Yellow ClearNode (Sandbox)');
        }, 1000);
    };

    const openYellowChannel = async () => {
        if (!yellowPartner) {
            addLog('error', 'Partner address required');
            return;
        }
        addLog('info', 'Opening state channel...');
        setTimeout(() => {
            const channelId = 'channel_' + Date.now();
            setYellowChannel(channelId);
            addLog('success', `Channel opened: ${channelId}`);
        }, 1500);
    };

    const sendYellowPayment = async () => {
        if (!yellowChannel) {
            addLog('error', 'No active channel');
            return;
        }
        addLog('info', `Sending ${yellowAmount} via Yellow...`);
        setTimeout(() => {
            addLog('success', `💸 Instant payment sent: ${yellowAmount} (off-chain, no gas!)`);
        }, 100);
    };

    const refreshArcBalance = async () => {
        if (!account) {
            addLog('error', 'Connect wallet first');
            return;
        }
        addLog('info', 'Fetching USDC balance...');
        setTimeout(() => {
            setArcBalance('1234.56');
            addLog('success', 'Balance refreshed: 1,234.56 USDC');
        }, 1000);
    };

    const sendArcTransfer = async () => {
        if (!arcRecipient || !arcAmount) {
            addLog('error', 'Recipient and amount required');
            return;
        }
        addLog('info', `Transferring ${arcAmount} USDC...`);
        setTimeout(() => {
            const mockTxHash = '0x' + 'b'.repeat(64);
            addLog('tx', `Transfer complete: ${arcAmount} USDC`, mockTxHash);
        }, 2000);
    };

    const writeFunctions = FLEXSUB_ABI.filter((f) => f.type === 'function' && f.stateMutability !== 'view');
    const readFunctions = FLEXSUB_ABI.filter((f) => f.type === 'function' && f.stateMutability === 'view');

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.backLink}>← Back to Demo</Link>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🔧</span>
                        FlexSub Debug
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {connected ? (
                        <>
                            {chainId === 31337 && (
                                <>
                                    <button
                                        className={styles.faucetButton}
                                        onClick={requestAnvilFaucet}
                                        disabled={isFauceting}
                                    >
                                        {isFauceting ? '⏳...' : '🚰 ETH'}
                                    </button>
                                    <button
                                        className={styles.faucetButton}
                                        onClick={requestUsdcFaucet}
                                        disabled={isFauceting}
                                        style={{ marginLeft: '0.5rem' }}
                                    >
                                        {isFauceting ? '⏳...' : '💵 USDC'}
                                    </button>
                                </>
                            )}
                            <div className={styles.connectedBadge}>
                                🟢 {account.slice(0, 6)}...{account.slice(-4)}
                                {chainId === 31337 && <span className={styles.chainBadge}>Anvil</span>}
                            </div>
                        </>
                    ) : (
                        <button className={styles.connectButton} onClick={connectWallet}>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <nav className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'contract' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('contract')}
                >
                    📜 Contract
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'lifi' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('lifi')}
                >
                    🌐 LI.FI
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'yellow' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('yellow')}
                >
                    ⚡ Yellow
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'arc' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('arc')}
                >
                    💵 Arc/USDC
                </button>
            </nav>

            <div className={styles.mainContent}>
                {/* Left Panel - Interactive */}
                <div className={styles.leftPanel}>
                    {activeTab === 'contract' && (
                        <div className={styles.panel}>
                            <h3>FlexSubManager Contract</h3>

                            <div className={styles.inputGroup}>
                                <label>Contract Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                />
                            </div>

                            <div className={styles.functionSection}>
                                <h4>📝 Write Functions</h4>
                                <div className={styles.functionList}>
                                    {writeFunctions.map((func) => (
                                        <button
                                            key={func.name}
                                            className={`${styles.functionButton} ${selectedFunction?.name === func.name ? styles.selected : ''}`}
                                            onClick={() => handleFunctionSelect(func)}
                                        >
                                            {func.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.functionSection}>
                                <h4>📖 Read Functions</h4>
                                <div className={styles.functionList}>
                                    {readFunctions.map((func) => (
                                        <button
                                            key={func.name}
                                            className={`${styles.functionButton} ${styles.readFunction} ${selectedFunction?.name === func.name ? styles.selected : ''}`}
                                            onClick={() => handleFunctionSelect(func)}
                                        >
                                            {func.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedFunction && (
                                <div className={styles.functionForm}>
                                    <h4>{selectedFunction.name}</h4>
                                    {inputs.map((input, index) => (
                                        <div key={input.name} className={styles.inputGroup}>
                                            <label>
                                                {input.name} <span className={styles.type}>({input.type})</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={`Enter ${input.name}`}
                                                value={input.value}
                                                onChange={(e) => handleInputChange(index, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <button
                                        className={styles.executeButton}
                                        onClick={executeFunction}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? '⏳ Executing...' : selectedFunction.stateMutability === 'view' ? '📖 Read' : '✍️ Write'}
                                    </button>
                                </div>
                            )}

                            {result && (
                                <div className={styles.resultBox}>
                                    <h4>Result</h4>
                                    <pre>{result}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'lifi' && (
                        <div className={styles.panel}>
                            <h3>🌐 LI.FI Cross-Chain</h3>
                            <p className={styles.description}>
                                Test cross-chain swaps and bridges using LI.FI SDK
                            </p>

                            <div className={styles.inputGroup}>
                                <label>From Chain</label>
                                <select value={lifiFromChain} onChange={(e) => setLifiFromChain(e.target.value)}>
                                    <option value="1">Ethereum</option>
                                    <option value="10">Optimism</option>
                                    <option value="137">Polygon</option>
                                    <option value="42161">Arbitrum</option>
                                    <option value="8453">Base</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>To Chain</label>
                                <select value={lifiToChain} onChange={(e) => setLifiToChain(e.target.value)}>
                                    <option value="1">Ethereum</option>
                                    <option value="10">Optimism</option>
                                    <option value="137">Polygon</option>
                                    <option value="42161">Arbitrum</option>
                                    <option value="8453">Base</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Amount (USDC)</label>
                                <input
                                    type="text"
                                    value={lifiAmount}
                                    onChange={(e) => setLifiAmount(e.target.value)}
                                />
                            </div>

                            <button className={styles.executeButton} onClick={getLifiQuote} disabled={isLoading}>
                                {isLoading ? '⏳ Getting Quote...' : '🔍 Get Quote'}
                            </button>

                            {lifiQuote && (
                                <div className={styles.quoteBox}>
                                    <h4>Quote</h4>
                                    <div className={styles.quoteRow}>
                                        <span>Route:</span>
                                        <span>{lifiQuote.route}</span>
                                    </div>
                                    <div className={styles.quoteRow}>
                                        <span>You receive:</span>
                                        <span>{(parseInt(lifiQuote.toAmount) / 1000000).toFixed(2)} USDC</span>
                                    </div>
                                    <div className={styles.quoteRow}>
                                        <span>Est. Time:</span>
                                        <span>{lifiQuote.estimatedTime}s</span>
                                    </div>
                                    <div className={styles.quoteRow}>
                                        <span>Fees:</span>
                                        <span>{lifiQuote.fees}</span>
                                    </div>
                                    <button className={styles.executeButton}>
                                        🚀 Execute Swap
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'yellow' && (
                        <div className={styles.panel}>
                            <h3>⚡ Yellow Network</h3>
                            <p className={styles.description}>
                                Test state channel operations for instant micropayments
                            </p>

                            <div className={styles.statusRow}>
                                <span>ClearNode Status:</span>
                                <span className={yellowConnected ? styles.statusGreen : styles.statusRed}>
                                    {yellowConnected ? '🟢 Connected' : '🔴 Disconnected'}
                                </span>
                            </div>

                            {!yellowConnected ? (
                                <button className={styles.executeButton} onClick={connectYellow}>
                                    🔌 Connect to ClearNode
                                </button>
                            ) : (
                                <>
                                    <div className={styles.inputGroup}>
                                        <label>Partner Address</label>
                                        <input
                                            type="text"
                                            placeholder="0x..."
                                            value={yellowPartner}
                                            onChange={(e) => setYellowPartner(e.target.value)}
                                        />
                                    </div>

                                    <button className={styles.executeButton} onClick={openYellowChannel}>
                                        📂 Open Channel
                                    </button>

                                    {yellowChannel && (
                                        <>
                                            <div className={styles.channelInfo}>
                                                <span className={styles.channelBadge}>🔗 {yellowChannel}</span>
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>Payment Amount</label>
                                                <input
                                                    type="text"
                                                    value={yellowAmount}
                                                    onChange={(e) => setYellowAmount(e.target.value)}
                                                />
                                            </div>

                                            <button className={styles.executeButton} onClick={sendYellowPayment}>
                                                💸 Send Instant Payment
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'arc' && (
                        <div className={styles.panel}>
                            <h3>💵 Arc / USDC</h3>
                            <p className={styles.description}>
                                USDC balance and transfer operations
                            </p>

                            <div className={styles.balanceCard}>
                                <span className={styles.balanceLabel}>USDC Balance</span>
                                <span className={styles.balanceAmount}>${arcBalance}</span>
                                <button className={styles.refreshButton} onClick={refreshArcBalance}>
                                    🔄 Refresh
                                </button>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Recipient Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={arcRecipient}
                                    onChange={(e) => setArcRecipient(e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Amount (USDC)</label>
                                <input
                                    type="text"
                                    value={arcAmount}
                                    onChange={(e) => setArcAmount(e.target.value)}
                                />
                            </div>

                            <button className={styles.executeButton} onClick={sendArcTransfer}>
                                📤 Transfer USDC
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Logs */}
                <div className={styles.rightPanel}>
                    <div className={styles.logsHeader}>
                        <h3>📋 Activity Log</h3>
                        <button className={styles.clearButton} onClick={() => setLogs([])}>
                            Clear
                        </button>
                    </div>
                    <div className={styles.logsContainer}>
                        {logs.length === 0 ? (
                            <p className={styles.noLogs}>No activity yet. Start interacting!</p>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className={`${styles.logEntry} ${styles[log.type]}`}>
                                    <span className={styles.logTime}>{log.timestamp}</span>
                                    <span className={styles.logMessage}>{log.message}</span>
                                    {log.txHash && (
                                        <a
                                            href={`https://arbiscan.io/tx/${log.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.txLink}
                                        >
                                            View Tx ↗
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
