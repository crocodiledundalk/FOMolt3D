# Transaction History

Patterns for fetching, parsing, and displaying transaction history including program logs, events, and human-readable transaction summaries.

## Table of Contents

1. [Fetching Transaction History](#fetching-transaction-history)
2. [Parsing Transaction Details](#parsing-transaction-details)
3. [Event Extraction](#event-extraction)
4. [Transaction Display](#transaction-display)
5. [Real-time History](#real-time-history)

---

## Fetching Transaction History

### Basic Transaction Signatures Hook

```tsx
// hooks/data/useTransactionHistory.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ConfirmedSignatureInfo,
  GetSignaturesForAddressOptions,
  PublicKey,
} from '@solana/web3.js';

const PAGE_SIZE = 20;

export function useTransactionSignatures(address?: string | PublicKey) {
  const { connection } = useConnection();

  return useInfiniteQuery({
    queryKey: ['transactionSignatures', address?.toString()],
    queryFn: async ({ pageParam }): Promise<ConfirmedSignatureInfo[]> => {
      if (!address) throw new Error('No address');

      const pubkey = typeof address === 'string'
        ? new PublicKey(address)
        : address;

      const options: GetSignaturesForAddressOptions = {
        limit: PAGE_SIZE,
      };

      if (pageParam) {
        options.before = pageParam;
      }

      return connection.getSignaturesForAddress(pubkey, options);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.signature;
    },
    enabled: !!address,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Hook for current wallet's history
export function useWalletTransactionHistory() {
  const { publicKey } = useWallet();
  return useTransactionSignatures(publicKey ?? undefined);
}
```

### Fetching Full Transaction Details

```tsx
// hooks/data/useTransactionDetails.ts
import { useQuery, useQueries } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  ParsedTransactionWithMeta,
  GetVersionedTransactionConfig,
} from '@solana/web3.js';

export function useTransactionDetails(signature: string | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['transaction', signature],
    queryFn: async (): Promise<ParsedTransactionWithMeta | null> => {
      if (!signature) throw new Error('No signature');

      return connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    },
    enabled: !!signature,
    staleTime: Infinity, // Transactions are immutable
  });
}

// Batch fetch multiple transactions
export function useTransactionsDetails(signatures: string[]) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['transactions', signatures.sort().join(',')],
    queryFn: async () => {
      if (signatures.length === 0) return [];

      const transactions = await connection.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0,
      });

      return transactions;
    },
    enabled: signatures.length > 0,
    staleTime: Infinity,
  });
}
```

### Helius Enhanced API

```tsx
// lib/api/helius.ts
const HELIUS_API_URL = 'https://api.helius.xyz/v0';

export interface EnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  description: string;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: { tokenAmount: string; decimals: number };
    }>;
  }>;
  events?: {
    nft?: any;
    swap?: any;
    compressed?: any;
  };
}

export async function fetchEnhancedTransactions(
  address: string,
  options?: { before?: string; limit?: number }
): Promise<EnhancedTransaction[]> {
  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!apiKey) throw new Error('Helius API key required');

  const params = new URLSearchParams({
    'api-key': apiKey,
  });

  if (options?.before) params.append('before', options.before);
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(
    `${HELIUS_API_URL}/addresses/${address}/transactions?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

// Hook for Helius enhanced history
export function useEnhancedTransactionHistory(address?: string) {
  return useInfiniteQuery({
    queryKey: ['enhancedTransactions', address],
    queryFn: async ({ pageParam }) => {
      if (!address) throw new Error('No address');
      return fetchEnhancedTransactions(address, {
        before: pageParam,
        limit: 20,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1]?.signature;
    },
    enabled: !!address,
    staleTime: 1000 * 30,
  });
}
```

---

## Parsing Transaction Details

### Transaction Type Detection

```tsx
// lib/transaction/parser.ts
import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';

export type TransactionType =
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'nft'
  | 'program_interaction'
  | 'unknown';

interface ParsedTransaction {
  signature: string;
  type: TransactionType;
  timestamp: number | null;
  fee: number;
  status: 'success' | 'failed';
  description: string;
  transfers: Transfer[];
}

interface Transfer {
  type: 'sol' | 'token';
  from: string;
  to: string;
  amount: number;
  mint?: string;
  decimals?: number;
}

// Known program IDs for classification
const PROGRAM_LABELS: Record<string, string> = {
  '11111111111111111111111111111111': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CPMM',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex Metadata',
};

export function parseTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string,
  walletAddress?: string
): ParsedTransaction {
  const status = tx.meta?.err ? 'failed' : 'success';
  const fee = tx.meta?.fee ?? 0;
  const timestamp = tx.blockTime ?? null;

  // Extract transfers
  const transfers = extractTransfers(tx, walletAddress);

  // Detect transaction type
  const type = detectTransactionType(tx);

  // Generate description
  const description = generateDescription(type, transfers, walletAddress);

  return {
    signature,
    type,
    timestamp,
    fee,
    status,
    description,
    transfers,
  };
}

function extractTransfers(
  tx: ParsedTransactionWithMeta,
  walletAddress?: string
): Transfer[] {
  const transfers: Transfer[] = [];

  // Extract SOL transfers from pre/post balances
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  const accountKeys = tx.transaction.message.accountKeys;

  for (let i = 0; i < accountKeys.length; i++) {
    const change = (postBalances[i] ?? 0) - (preBalances[i] ?? 0);
    if (change !== 0 && Math.abs(change) > tx.meta?.fee!) {
      // Find corresponding transfer
      const account = accountKeys[i].pubkey.toBase58();
      transfers.push({
        type: 'sol',
        from: change < 0 ? account : '',
        to: change > 0 ? account : '',
        amount: Math.abs(change),
      });
    }
  }

  // Extract token transfers
  const preTokenBalances = tx.meta?.preTokenBalances ?? [];
  const postTokenBalances = tx.meta?.postTokenBalances ?? [];

  const tokenChanges = new Map<string, { pre: number; post: number; mint: string; decimals: number }>();

  for (const balance of preTokenBalances) {
    const key = `${balance.owner}-${balance.mint}`;
    const existing = tokenChanges.get(key) || { pre: 0, post: 0, mint: balance.mint, decimals: balance.uiTokenAmount.decimals };
    existing.pre = balance.uiTokenAmount.uiAmount ?? 0;
    tokenChanges.set(key, existing);
  }

  for (const balance of postTokenBalances) {
    const key = `${balance.owner}-${balance.mint}`;
    const existing = tokenChanges.get(key) || { pre: 0, post: 0, mint: balance.mint, decimals: balance.uiTokenAmount.decimals };
    existing.post = balance.uiTokenAmount.uiAmount ?? 0;
    tokenChanges.set(key, existing);
  }

  for (const [key, { pre, post, mint, decimals }] of tokenChanges) {
    const change = post - pre;
    if (change !== 0) {
      const owner = key.split('-')[0];
      transfers.push({
        type: 'token',
        from: change < 0 ? owner : '',
        to: change > 0 ? owner : '',
        amount: Math.abs(change),
        mint,
        decimals,
      });
    }
  }

  return transfers;
}

function detectTransactionType(tx: ParsedTransactionWithMeta): TransactionType {
  const programIds = tx.transaction.message.accountKeys
    .filter((k) => k.signer === false && k.writable === false)
    .map((k) => k.pubkey.toBase58());

  // Check for swap programs
  if (
    programIds.some((id) =>
      ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
       'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
       'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'].includes(id)
    )
  ) {
    return 'swap';
  }

  // Check for NFT programs
  if (programIds.includes('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')) {
    return 'nft';
  }

  // Check for simple SOL transfer
  if (
    programIds.length === 1 &&
    programIds[0] === '11111111111111111111111111111111'
  ) {
    return 'transfer';
  }

  return 'program_interaction';
}

function generateDescription(
  type: TransactionType,
  transfers: Transfer[],
  walletAddress?: string
): string {
  switch (type) {
    case 'transfer':
      const solTransfer = transfers.find((t) => t.type === 'sol');
      if (solTransfer) {
        const direction = solTransfer.to === walletAddress ? 'Received' : 'Sent';
        return `${direction} ${(solTransfer.amount / 1e9).toFixed(4)} SOL`;
      }
      return 'Transfer';
    case 'swap':
      return 'Token Swap';
    case 'stake':
      return 'Staking Operation';
    case 'nft':
      return 'NFT Transaction';
    default:
      return 'Program Interaction';
  }
}
```

### Parsed Transaction Hook

```tsx
// hooks/data/useParsedTransactionHistory.ts
import { useMemo } from 'react';
import { useTransactionSignatures, useTransactionsDetails } from './useTransactionHistory';
import { parseTransaction } from '@/lib/transaction/parser';
import { useWallet } from '@solana/wallet-adapter-react';

export function useParsedTransactionHistory(address?: string) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const {
    data: signaturesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingSignatures,
  } = useTransactionSignatures(address);

  const signatures = useMemo(() => {
    return signaturesData?.pages.flat().map((s) => s.signature) ?? [];
  }, [signaturesData]);

  const { data: transactions, isLoading: isLoadingTx } = useTransactionsDetails(
    signatures.slice(0, 50) // Limit to prevent too many requests
  );

  const parsedTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
      .map((tx, i) => parseTransaction(tx, signatures[i], walletAddress));
  }, [transactions, signatures, walletAddress]);

  return {
    transactions: parsedTransactions,
    isLoading: isLoadingSignatures || isLoadingTx,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
```

---

## Event Extraction

### Anchor Event Parser

```tsx
// lib/transaction/events.ts
import { BorshCoder, EventParser, Program } from '@coral-xyz/anchor';
import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { IDL, MyProgram } from '@/programs/myProgram';

const PROGRAM_ID = new PublicKey('YourProgramId111111111111111111111111');

export interface ProgramEvent {
  name: string;
  data: any;
}

export function extractProgramEvents(
  tx: ParsedTransactionWithMeta
): ProgramEvent[] {
  if (!tx.meta?.logMessages) return [];

  const coder = new BorshCoder(IDL);
  const eventParser = new EventParser(PROGRAM_ID, coder);

  const events: ProgramEvent[] = [];

  for (const event of eventParser.parseLogs(tx.meta.logMessages)) {
    events.push({
      name: event.name,
      data: event.data,
    });
  }

  return events;
}

// Hook for transaction events
export function useTransactionEvents(signature: string | undefined) {
  const { data: tx } = useTransactionDetails(signature);

  return useMemo(() => {
    if (!tx) return [];
    return extractProgramEvents(tx);
  }, [tx]);
}
```

### Log Parsing

```tsx
// lib/transaction/logs.ts

export interface ParsedLog {
  programId: string;
  message: string;
  depth: number;
  type: 'invoke' | 'success' | 'error' | 'log' | 'data';
}

export function parseTransactionLogs(logs: string[]): ParsedLog[] {
  const parsed: ParsedLog[] = [];
  let depth = 0;

  for (const log of logs) {
    // Program invoke
    if (log.startsWith('Program ') && log.includes('invoke')) {
      const match = log.match(/Program (\w+) invoke \[(\d+)\]/);
      if (match) {
        parsed.push({
          programId: match[1],
          message: log,
          depth: parseInt(match[2]) - 1,
          type: 'invoke',
        });
        depth = parseInt(match[2]);
      }
      continue;
    }

    // Program success
    if (log.startsWith('Program ') && log.includes('success')) {
      const match = log.match(/Program (\w+) success/);
      if (match) {
        parsed.push({
          programId: match[1],
          message: log,
          depth: depth - 1,
          type: 'success',
        });
        depth = Math.max(0, depth - 1);
      }
      continue;
    }

    // Program error
    if (log.startsWith('Program ') && log.includes('failed')) {
      parsed.push({
        programId: '',
        message: log,
        depth,
        type: 'error',
      });
      continue;
    }

    // Program log
    if (log.startsWith('Program log:')) {
      parsed.push({
        programId: '',
        message: log.replace('Program log: ', ''),
        depth,
        type: 'log',
      });
      continue;
    }

    // Program data (base64 encoded)
    if (log.startsWith('Program data:')) {
      parsed.push({
        programId: '',
        message: log.replace('Program data: ', ''),
        depth,
        type: 'data',
      });
    }
  }

  return parsed;
}
```

---

## Transaction Display

### Transaction List Component

```tsx
// components/TransactionHistory.tsx
import { useParsedTransactionHistory } from '@/hooks/data/useParsedTransactionHistory';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatDistanceToNow } from 'date-fns';
import { getExplorerUrl } from '@/lib/explorer';

export function TransactionHistory() {
  const { publicKey } = useWallet();
  const {
    transactions,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useParsedTransactionHistory(publicKey?.toBase58());

  if (!publicKey) {
    return <div>Connect wallet to view history</div>;
  }

  if (isLoading) {
    return <TransactionSkeleton />;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Transaction History</h2>

      <div className="divide-y">
        {transactions.map((tx) => (
          <TransactionRow key={tx.signature} transaction={tx} />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-2 text-center text-blue-500 hover:text-blue-600"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: ParsedTransaction }) {
  const explorerUrl = getExplorerUrl('tx', transaction.signature);

  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <TransactionTypeIcon type={transaction.type} />
        <div>
          <p className="font-medium">{transaction.description}</p>
          <p className="text-sm text-gray-500">
            {transaction.timestamp
              ? formatDistanceToNow(transaction.timestamp * 1000, { addSuffix: true })
              : 'Unknown time'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={transaction.status} />
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600"
        >
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function TransactionTypeIcon({ type }: { type: TransactionType }) {
  const icons = {
    transfer: <ArrowRightLeft className="w-5 h-5" />,
    swap: <RefreshCw className="w-5 h-5" />,
    stake: <Lock className="w-5 h-5" />,
    nft: <Image className="w-5 h-5" />,
    program_interaction: <Code className="w-5 h-5" />,
    unknown: <HelpCircle className="w-5 h-5" />,
  };

  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
      {icons[type]}
    </div>
  );
}

function StatusBadge({ status }: { status: 'success' | 'failed' }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded ${
        status === 'success'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {status}
    </span>
  );
}
```

### Transaction Detail Modal

```tsx
// components/TransactionDetail.tsx
import { useTransactionDetails } from '@/hooks/data/useTransactionDetails';
import { parseTransactionLogs } from '@/lib/transaction/logs';
import { extractProgramEvents } from '@/lib/transaction/events';

interface TransactionDetailProps {
  signature: string;
  onClose: () => void;
}

export function TransactionDetail({ signature, onClose }: TransactionDetailProps) {
  const { data: tx, isLoading } = useTransactionDetails(signature);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!tx) {
    return <div>Transaction not found</div>;
  }

  const logs = parseTransactionLogs(tx.meta?.logMessages ?? []);
  const events = extractProgramEvents(tx);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">Transaction Details</h2>
        <button onClick={onClose}>&times;</button>
      </div>

      <div className="space-y-4">
        {/* Signature */}
        <div>
          <label className="text-sm text-gray-500">Signature</label>
          <p className="font-mono text-sm break-all">{signature}</p>
        </div>

        {/* Status */}
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <StatusBadge status={tx.meta?.err ? 'failed' : 'success'} />
        </div>

        {/* Fee */}
        <div>
          <label className="text-sm text-gray-500">Fee</label>
          <p>{(tx.meta?.fee ?? 0) / 1e9} SOL</p>
        </div>

        {/* Events */}
        {events.length > 0 && (
          <div>
            <label className="text-sm text-gray-500">Events</label>
            <div className="mt-1 space-y-2">
              {events.map((event, i) => (
                <div key={i} className="bg-gray-50 p-2 rounded">
                  <p className="font-medium">{event.name}</p>
                  <pre className="text-xs mt-1 overflow-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div>
          <label className="text-sm text-gray-500">Logs</label>
          <div className="mt-1 bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-60 overflow-auto">
            {logs.map((log, i) => (
              <div
                key={i}
                style={{ paddingLeft: `${log.depth * 12}px` }}
                className={log.type === 'error' ? 'text-red-400' : ''}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Real-time History

### Signature Subscription

```tsx
// hooks/useTransactionSubscription.ts
import { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';

export function useTransactionSubscription() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!publicKey) return;

    const subscriptionId = connection.onLogs(
      publicKey,
      (logs) => {
        // Invalidate transaction history when new logs detected
        queryClient.invalidateQueries({
          queryKey: ['transactionSignatures', publicKey.toBase58()],
        });
      },
      'confirmed'
    );

    return () => {
      connection.removeOnLogsListener(subscriptionId);
    };
  }, [connection, publicKey, queryClient]);
}
```

---

## Best Practices

### 1. Use Helius for Enhanced History

```tsx
// Helius provides pre-parsed transactions
const { data } = useEnhancedTransactionHistory(address);
// Returns: type, description, transfers already parsed
```

### 2. Paginate Transaction Fetching

```tsx
// Use infinite query for history
const { fetchNextPage, hasNextPage } = useTransactionSignatures(address);
```

### 3. Cache Immutable Data

```tsx
// Transactions never change
staleTime: Infinity,
```

### 4. Handle Missing Transactions

```tsx
// Some transactions may be pruned from RPC
if (!tx) return <div>Transaction not available</div>;
```

### 5. Parse Events for Your Program

```tsx
// Use Anchor's event parser for program-specific events
const events = extractProgramEvents(tx);
```

---

## External Resources

- [Solana Transaction Structure](https://solana.com/docs/core/transactions)
- [Helius Enhanced Transactions API](https://docs.helius.dev/solana-apis/enhanced-transactions-api)
- [Anchor Events](https://www.anchor-lang.com/docs/events)
- [getParsedTransaction RPC](https://solana.com/docs/rpc/http/getparsedtransaction)
