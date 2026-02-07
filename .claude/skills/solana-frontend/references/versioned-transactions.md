# Versioned Transactions

Patterns for working with versioned transactions (v0) and Address Lookup Tables (ALTs) for more efficient transaction construction.

## Table of Contents

1. [Understanding Versioned Transactions](#understanding-versioned-transactions)
2. [Creating Versioned Transactions](#creating-versioned-transactions)
3. [Address Lookup Tables](#address-lookup-tables)
4. [Transaction Building Patterns](#transaction-building-patterns)
5. [Signing and Sending](#signing-and-sending)

---

## Understanding Versioned Transactions

### Legacy vs Versioned Transactions

| Feature | Legacy Transaction | Versioned (v0) |
|---------|-------------------|----------------|
| Max accounts | ~35 | 256 (with ALTs) |
| Address format | All inline | Inline + lookup |
| Size limit | 1232 bytes | 1232 bytes |
| ALT support | No | Yes |

### When to Use Versioned Transactions

- **Complex DeFi operations** (swaps with multiple routes)
- **NFT batch operations**
- **Multi-instruction transactions**
- **Any transaction approaching account limits**

---

## Creating Versioned Transactions

### Basic Versioned Transaction

```tsx
// lib/transaction/versioned.ts
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from '@solana/web3.js';

export async function createVersionedTransaction(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  lookupTables: AddressLookupTableAccount[] = []
): Promise<VersionedTransaction> {
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Create v0 message
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTables);

  // Create versioned transaction
  const transaction = new VersionedTransaction(messageV0);

  return transaction;
}
```

### Versioned Transaction Hook

```tsx
// hooks/useVersionedTransaction.ts
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from '@solana/web3.js';

export function useVersionedTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const buildTransaction = useCallback(
    async (
      instructions: TransactionInstruction[],
      lookupTables: AddressLookupTableAccount[] = []
    ): Promise<VersionedTransaction> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const { blockhash } = await connection.getLatestBlockhash('confirmed');

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message(lookupTables);

      return new VersionedTransaction(messageV0);
    },
    [connection, publicKey]
  );

  const signAndSend = useCallback(
    async (transaction: VersionedTransaction): Promise<string> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      return signature;
    },
    [connection, publicKey, signTransaction]
  );

  return {
    buildTransaction,
    signAndSend,
  };
}
```

---

## Address Lookup Tables

### Fetching Lookup Tables

```tsx
// lib/lookupTables.ts
import {
  Connection,
  PublicKey,
  AddressLookupTableAccount,
} from '@solana/web3.js';

export async function fetchLookupTable(
  connection: Connection,
  address: PublicKey
): Promise<AddressLookupTableAccount | null> {
  const accountInfo = await connection.getAddressLookupTable(address);
  return accountInfo.value;
}

export async function fetchLookupTables(
  connection: Connection,
  addresses: PublicKey[]
): Promise<AddressLookupTableAccount[]> {
  const tables = await Promise.all(
    addresses.map((addr) => fetchLookupTable(connection, addr))
  );

  return tables.filter((t): t is AddressLookupTableAccount => t !== null);
}
```

### Lookup Table Hook

```tsx
// hooks/useLookupTable.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { fetchLookupTable } from '@/lib/lookupTables';

export function useLookupTable(address: string | PublicKey | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['lookupTable', address?.toString()],
    queryFn: async () => {
      if (!address) throw new Error('No address');
      const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
      return fetchLookupTable(connection, pubkey);
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5, // 5 minutes - ALTs don't change often
  });
}

export function useLookupTables(addresses: (string | PublicKey)[]) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['lookupTables', addresses.map((a) => a.toString()).sort().join(',')],
    queryFn: async () => {
      const pubkeys = addresses.map((a) =>
        typeof a === 'string' ? new PublicKey(a) : a
      );
      return fetchLookupTables(connection, pubkeys);
    },
    enabled: addresses.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
```

### Creating Lookup Tables

```tsx
// lib/createLookupTable.ts
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  AddressLookupTableProgram,
  Keypair,
} from '@solana/web3.js';

export async function createLookupTableInstruction(
  connection: Connection,
  authority: PublicKey
): Promise<{
  instruction: TransactionInstruction;
  lookupTableAddress: PublicKey;
}> {
  const slot = await connection.getSlot();

  const [instruction, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority,
      payer: authority,
      recentSlot: slot,
    });

  return { instruction, lookupTableAddress };
}

export function extendLookupTableInstruction(
  lookupTableAddress: PublicKey,
  authority: PublicKey,
  addresses: PublicKey[]
): TransactionInstruction {
  return AddressLookupTableProgram.extendLookupTable({
    lookupTable: lookupTableAddress,
    authority,
    payer: authority,
    addresses,
  });
}
```

### Known Lookup Tables

```tsx
// lib/constants/lookupTables.ts
import { PublicKey } from '@solana/web3.js';

// Common lookup tables for popular protocols
export const KNOWN_LOOKUP_TABLES = {
  // Jupiter
  jupiter: new PublicKey('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'),

  // Raydium
  raydium: new PublicKey('RayDiumfcSqC2g6EXBmLJADqJWiGjCAqLG7v8N5r4kM'),

  // Orca
  orca: new PublicKey('OrcaWhirlpooLs96dxNPqNK4xAhYcCZSZmfUhLWHB'),
};

export async function getCommonLookupTables(
  connection: Connection
): Promise<AddressLookupTableAccount[]> {
  const addresses = Object.values(KNOWN_LOOKUP_TABLES);
  return fetchLookupTables(connection, addresses);
}
```

---

## Transaction Building Patterns

### Smart Transaction Builder

```tsx
// lib/transaction/builder.ts
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  AddressLookupTableAccount,
} from '@solana/web3.js';

interface TransactionBuildResult {
  transaction: VersionedTransaction | Transaction;
  isVersioned: boolean;
  accountCount: number;
}

export class SmartTransactionBuilder {
  private connection: Connection;
  private payer: PublicKey;
  private instructions: TransactionInstruction[] = [];
  private lookupTables: AddressLookupTableAccount[] = [];

  constructor(connection: Connection, payer: PublicKey) {
    this.connection = connection;
    this.payer = payer;
  }

  addInstruction(instruction: TransactionInstruction): this {
    this.instructions.push(instruction);
    return this;
  }

  addInstructions(instructions: TransactionInstruction[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  addLookupTable(table: AddressLookupTableAccount): this {
    this.lookupTables.push(table);
    return this;
  }

  addLookupTables(tables: AddressLookupTableAccount[]): this {
    this.lookupTables.push(...tables);
    return this;
  }

  private getUniqueAccounts(): Set<string> {
    const accounts = new Set<string>();
    accounts.add(this.payer.toBase58());

    for (const ix of this.instructions) {
      accounts.add(ix.programId.toBase58());
      for (const key of ix.keys) {
        accounts.add(key.pubkey.toBase58());
      }
    }

    return accounts;
  }

  async build(): Promise<TransactionBuildResult> {
    const uniqueAccounts = this.getUniqueAccounts();
    const accountCount = uniqueAccounts.size;

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    // Use legacy transaction if few accounts and no lookup tables
    if (accountCount <= 30 && this.lookupTables.length === 0) {
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.payer;
      transaction.add(...this.instructions);

      return {
        transaction,
        isVersioned: false,
        accountCount,
      };
    }

    // Use versioned transaction
    const messageV0 = new TransactionMessage({
      payerKey: this.payer,
      recentBlockhash: blockhash,
      instructions: this.instructions,
    }).compileToV0Message(this.lookupTables);

    const transaction = new VersionedTransaction(messageV0);

    return {
      transaction,
      isVersioned: true,
      accountCount,
    };
  }
}

// Usage
export async function buildSmartTransaction(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  lookupTables?: AddressLookupTableAccount[]
): Promise<TransactionBuildResult> {
  const builder = new SmartTransactionBuilder(connection, payer);
  builder.addInstructions(instructions);

  if (lookupTables) {
    builder.addLookupTables(lookupTables);
  }

  return builder.build();
}
```

### Hook for Smart Transactions

```tsx
// hooks/useSmartTransaction.ts
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  TransactionInstruction,
  AddressLookupTableAccount,
  VersionedTransaction,
  Transaction,
} from '@solana/web3.js';
import { buildSmartTransaction } from '@/lib/transaction/builder';

export function useSmartTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const execute = useCallback(
    async (
      instructions: TransactionInstruction[],
      lookupTables?: AddressLookupTableAccount[]
    ): Promise<string> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const { transaction, isVersioned } = await buildSmartTransaction(
        connection,
        publicKey,
        instructions,
        lookupTables
      );

      const signed = await signTransaction(transaction);

      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        { skipPreflight: false }
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
    [connection, publicKey, signTransaction]
  );

  return { execute };
}
```

---

## Signing and Sending

### Signing Versioned Transactions

```tsx
// lib/transaction/sign.ts
import {
  VersionedTransaction,
  Keypair,
  Connection,
} from '@solana/web3.js';

export function signVersionedTransaction(
  transaction: VersionedTransaction,
  signers: Keypair[]
): VersionedTransaction {
  transaction.sign(signers);
  return transaction;
}

// For wallet adapter
export async function signWithWallet(
  transaction: VersionedTransaction,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<VersionedTransaction> {
  return signTransaction(transaction);
}
```

### Sending and Confirming

```tsx
// lib/transaction/sendVersioned.ts
import {
  Connection,
  VersionedTransaction,
  SendOptions,
} from '@solana/web3.js';

interface SendVersionedOptions extends SendOptions {
  confirmationTimeout?: number;
}

export async function sendAndConfirmVersionedTransaction(
  connection: Connection,
  transaction: VersionedTransaction,
  options: SendVersionedOptions = {}
): Promise<string> {
  const {
    skipPreflight = false,
    preflightCommitment = 'confirmed',
    confirmationTimeout = 60000,
    ...sendOptions
  } = options;

  // Get blockhash for confirmation
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Send transaction
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    {
      skipPreflight,
      preflightCommitment,
      ...sendOptions,
    }
  );

  // Confirm with timeout
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  return signature;
}
```

### Complete Transaction Hook

```tsx
// hooks/useVersionedTransactionWithConfirmation.ts
import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  TransactionInstruction,
  AddressLookupTableAccount,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';

interface TransactionState {
  status: 'idle' | 'building' | 'signing' | 'sending' | 'confirming' | 'success' | 'error';
  signature?: string;
  error?: string;
}

export function useVersionedTransactionWithConfirmation() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [state, setState] = useState<TransactionState>({ status: 'idle' });

  const execute = useCallback(
    async (
      instructions: TransactionInstruction[],
      lookupTables: AddressLookupTableAccount[] = []
    ): Promise<string | null> => {
      if (!publicKey || !signTransaction) {
        setState({ status: 'error', error: 'Wallet not connected' });
        return null;
      }

      try {
        // Building
        setState({ status: 'building' });
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('confirmed');

        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message(lookupTables);

        const transaction = new VersionedTransaction(messageV0);

        // Signing
        setState({ status: 'signing' });
        const signed = await signTransaction(transaction);

        // Sending
        setState({ status: 'sending' });
        const signature = await connection.sendRawTransaction(signed.serialize());

        // Confirming
        setState({ status: 'confirming', signature });
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        setState({ status: 'success', signature });
        return signature;
      } catch (error: any) {
        setState({
          status: 'error',
          error: error.message || 'Transaction failed',
        });
        return null;
      }
    },
    [connection, publicKey, signTransaction]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    execute,
    reset,
    ...state,
    isLoading: ['building', 'signing', 'sending', 'confirming'].includes(state.status),
  };
}
```

---

## Best Practices

### 1. Check Account Count Before Building

```tsx
// Estimate if ALTs are needed
const uniqueAccounts = getUniqueAccounts(instructions);
const needsALT = uniqueAccounts.size > 30;
```

### 2. Cache Lookup Tables

```tsx
// ALTs don't change often, cache aggressively
useQuery({
  queryKey: ['lookupTable', address],
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

### 3. Handle Legacy Wallet Support

```tsx
// Some wallets don't support versioned transactions
try {
  await signTransaction(versionedTx);
} catch (error) {
  if (error.message?.includes('versioned')) {
    // Fall back to legacy transaction
    await signTransaction(legacyTx);
  }
}
```

### 4. Use Jupiter's ALTs

```tsx
// Jupiter provides commonly-used lookup tables
const jupiterALTs = await fetchJupiterLookupTables();
builder.addLookupTables(jupiterALTs);
```

### 5. Simulate Before Sending

```tsx
// Versioned transactions support simulation
const simulation = await connection.simulateTransaction(versionedTx);
if (simulation.value.err) {
  throw new Error(`Simulation failed: ${simulation.value.err}`);
}
```

---

## External Resources

- [Solana Versioned Transactions](https://solana.com/docs/advanced/versions)
- [Address Lookup Tables](https://solana.com/docs/advanced/lookup-tables)
- [Transaction Size Limits](https://solana.com/docs/core/transactions#size)
