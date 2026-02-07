# Transaction Construction

Comprehensive guide for building Solana transactions in frontend applications. Covers instruction building, pre/post instructions, compute budget, and working with IDLs.

## Table of Contents

1. [Transaction Basics](#transaction-basics)
2. [Building Instructions](#building-instructions)
3. [Pre and Post Instructions](#pre-and-post-instructions)
4. [Anchor IDL Transactions](#anchor-idl-transactions)
5. [Compute Budget Instructions](#compute-budget-instructions)
6. [Transaction Composition](#transaction-composition)
7. [Common Patterns](#common-patterns)

---

## Transaction Basics

### Transaction Structure

```tsx
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Connection,
  Keypair,
} from '@solana/web3.js';

// Basic transaction structure
const transaction = new Transaction();

// Add instructions
transaction.add(instruction1);
transaction.add(instruction2);

// Set transaction metadata
transaction.feePayer = payerPublicKey;
transaction.recentBlockhash = blockhash;

// Optionally set last valid block height for confirmation
transaction.lastValidBlockHeight = lastValidBlockHeight;
```

### Fetching Blockhash

```tsx
// hooks/useBlockhash.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';

export function useLatestBlockhash() {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['blockhash'],
    queryFn: async () => {
      const result = await connection.getLatestBlockhash('confirmed');
      return result;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}
```

### Full Transaction Builder

```tsx
// lib/transaction.ts
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';

interface TransactionBuilderOptions {
  feePayer: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
}

export function buildTransaction(
  instructions: TransactionInstruction[],
  options: TransactionBuilderOptions
): Transaction {
  const transaction = new Transaction({
    feePayer: options.feePayer,
    blockhash: options.blockhash,
    lastValidBlockHeight: options.lastValidBlockHeight,
  });

  instructions.forEach((ix) => transaction.add(ix));

  return transaction;
}
```

---

## Building Instructions

### System Program Instructions

```tsx
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Transfer SOL
const transferIx = SystemProgram.transfer({
  fromPubkey: senderPublicKey,
  toPubkey: recipientPublicKey,
  lamports: 0.1 * LAMPORTS_PER_SOL,
});

// Create account
const createAccountIx = SystemProgram.createAccount({
  fromPubkey: payerPublicKey,
  newAccountPubkey: newAccountPublicKey,
  lamports: rentExemptBalance,
  space: accountDataSize,
  programId: ownerProgramId,
});

// Allocate space
const allocateIx = SystemProgram.allocate({
  accountPubkey: accountPublicKey,
  space: newSize,
});
```

### Token Program Instructions

```tsx
import {
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Transfer tokens
const transferTokenIx = createTransferInstruction(
  sourceTokenAccount,
  destinationTokenAccount,
  ownerPublicKey,
  amount, // In base units (not UI amount)
  [], // Multi-signers if needed
  TOKEN_PROGRAM_ID
);

// Create ATA
const createAtaIx = createAssociatedTokenAccountInstruction(
  payerPublicKey,
  ataAddress,
  ownerPublicKey,
  mintAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Mint tokens
const mintIx = createMintToInstruction(
  mintAddress,
  destinationTokenAccount,
  mintAuthority,
  amount
);

// Burn tokens
const burnIx = createBurnInstruction(
  tokenAccountAddress,
  mintAddress,
  ownerPublicKey,
  amount
);

// Close token account
const closeIx = createCloseAccountInstruction(
  tokenAccountAddress,
  destinationPublicKey, // Receives remaining SOL
  ownerPublicKey
);
```

### Custom Program Instructions

```tsx
import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import * as borsh from 'borsh';

// Define instruction data schema
class TransferInstructionData {
  instruction: number;
  amount: bigint;

  constructor(props: { instruction: number; amount: bigint }) {
    this.instruction = props.instruction;
    this.amount = props.amount;
  }
}

const schema = new Map([
  [
    TransferInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amount', 'u64'],
      ],
    },
  ],
]);

// Build instruction
function buildCustomInstruction(
  programId: PublicKey,
  accounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  amount: bigint
): TransactionInstruction {
  const data = borsh.serialize(
    schema,
    new TransferInstructionData({ instruction: 1, amount })
  );

  return new TransactionInstruction({
    keys: accounts,
    programId,
    data: Buffer.from(data),
  });
}
```

---

## Pre and Post Instructions

### Identifying Required Instructions

```tsx
// lib/instructionHelpers.ts
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export async function getOrCreateAtaInstruction(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
): Promise<{ address: PublicKey; instruction: TransactionInstruction | null }> {
  const ata = await getAssociatedTokenAddress(mint, owner);

  try {
    await connection.getAccountInfo(ata);
    // ATA exists, no instruction needed
    return { address: ata, instruction: null };
  } catch {
    // ATA doesn't exist, need to create
    const instruction = createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return { address: ata, instruction };
  }
}

// Check if account exists
export async function accountExists(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  const info = await connection.getAccountInfo(address);
  return info !== null;
}
```

### Building with Pre-Instructions

```tsx
// hooks/useTransferWithAta.ts
import { useMutation } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { getOrCreateAtaInstruction } from '@/lib/instructionHelpers';

export function useTokenTransfer() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  return useMutation({
    mutationFn: async ({
      mint,
      recipient,
      amount,
    }: {
      mint: string;
      recipient: string;
      amount: number;
    }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const mintPubkey = new PublicKey(mint);
      const recipientPubkey = new PublicKey(recipient);

      // Get source ATA
      const sourceAta = await getAssociatedTokenAddress(mintPubkey, publicKey);

      // Check/create destination ATA
      const { address: destAta, instruction: createAtaIx } =
        await getOrCreateAtaInstruction(
          connection,
          publicKey, // Payer
          mintPubkey,
          recipientPubkey
        );

      // Build transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      // Add pre-instruction if needed
      if (createAtaIx) {
        transaction.add(createAtaIx);
      }

      // Add main instruction
      transaction.add(
        createTransferInstruction(
          sourceAta,
          destAta,
          publicKey,
          BigInt(amount)
        )
      );

      // Sign and send
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
  });
}
```

---

## Anchor IDL Transactions

### Setting Up Anchor Program

```tsx
// hooks/useProgram.ts
import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// Import your IDL
import idl from '@/idl/my_program.json';

const PROGRAM_ID = new PublicKey('YourProgramId...');

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, PROGRAM_ID, provider);
  }, [provider]);

  return { program, provider };
}
```

### Building IDL-Based Instructions

```tsx
// hooks/useProgramInstructions.ts
import { useProgram } from './useProgram';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export function useProgramInstructions() {
  const { program } = useProgram();

  const buildInitializeInstruction = async (
    config: PublicKey,
    authority: PublicKey,
    params: { fee: number; maxAmount: number }
  ): Promise<TransactionInstruction> => {
    if (!program) throw new Error('Program not initialized');

    return await program.methods
      .initialize({
        fee: new BN(params.fee),
        maxAmount: new BN(params.maxAmount),
      })
      .accounts({
        config,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  };

  const buildDepositInstruction = async (
    pool: PublicKey,
    user: PublicKey,
    userTokenAccount: PublicKey,
    poolTokenAccount: PublicKey,
    amount: bigint
  ): Promise<TransactionInstruction> => {
    if (!program) throw new Error('Program not initialized');

    return await program.methods
      .deposit(new BN(amount.toString()))
      .accounts({
        pool,
        user,
        userTokenAccount,
        poolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  };

  return {
    buildInitializeInstruction,
    buildDepositInstruction,
  };
}
```

### Complete Anchor Transaction

```tsx
// hooks/useDeposit.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useProgram, useProgramInstructions } from './useProgram';
import { getOrCreateAtaInstruction } from '@/lib/instructionHelpers';
import { toast } from 'sonner';

interface DepositParams {
  poolAddress: string;
  amount: number;
  mintAddress: string;
}

export function useDeposit() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { buildDepositInstruction } = useProgramInstructions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poolAddress, amount, mintAddress }: DepositParams) => {
      if (!publicKey || !signTransaction || !program) {
        throw new Error('Wallet or program not ready');
      }

      const pool = new PublicKey(poolAddress);
      const mint = new PublicKey(mintAddress);

      // Get pool data to find pool token account
      const poolData = await program.account.pool.fetch(pool);
      const poolTokenAccount = poolData.tokenAccount;

      // Get or create user ATA
      const { address: userAta, instruction: createAtaIx } =
        await getOrCreateAtaInstruction(connection, publicKey, mint, publicKey);

      // Build deposit instruction
      const depositIx = await buildDepositInstruction(
        pool,
        publicKey,
        userAta,
        poolTokenAccount,
        BigInt(amount)
      );

      // Build transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      // Add compute budget (optional but recommended)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })
      );

      // Add create ATA if needed
      if (createAtaIx) {
        transaction.add(createAtaIx);
      }

      // Add main instruction
      transaction.add(depositIx);

      // Sign and send
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
    onSuccess: (signature, { poolAddress, mintAddress }) => {
      toast.success('Deposit successful', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['tokenBalance', publicKey?.toBase58(), mintAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ['poolData', poolAddress],
      });
    },
    onError: (error) => {
      toast.error(parseTransactionError(error));
    },
  });
}
```

---

## Compute Budget Instructions

### Setting Compute Units

```tsx
import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

// Set compute unit limit
const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 200000, // Max: 1,400,000
});

// Set compute unit price (priority fee)
const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1000, // Price per CU in micro-lamports
});

// Add to transaction (MUST be first instructions)
transaction.add(setComputeUnitLimitIx);
transaction.add(setComputeUnitPriceIx);
// ... then add other instructions
```

### Dynamic Compute Budget

```tsx
// lib/computeBudget.ts
import { Connection, Transaction, ComputeBudgetProgram } from '@solana/web3.js';

interface ComputeBudgetEstimate {
  unitsConsumed: number;
  recommendedLimit: number;
  recommendedPriorityFee: number;
}

export async function estimateComputeBudget(
  connection: Connection,
  transaction: Transaction,
  accounts: string[]
): Promise<ComputeBudgetEstimate> {
  // Simulate with high limit to get actual usage
  const simulationTx = new Transaction();
  simulationTx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })
  );
  transaction.instructions.forEach((ix) => simulationTx.add(ix));
  simulationTx.feePayer = transaction.feePayer;
  simulationTx.recentBlockhash = transaction.recentBlockhash;

  const simulation = await connection.simulateTransaction(simulationTx);

  const unitsConsumed = simulation.value.unitsConsumed || 200_000;

  // Add 20% buffer
  const recommendedLimit = Math.ceil(unitsConsumed * 1.2);

  // Get priority fee from recent transactions
  const recentFees = await connection.getRecentPrioritizationFees({
    lockedWritableAccounts: accounts.map((a) => new PublicKey(a)),
  });

  const avgFee =
    recentFees.reduce((sum, f) => sum + f.prioritizationFee, 0) /
    recentFees.length;

  return {
    unitsConsumed,
    recommendedLimit: Math.min(recommendedLimit, 1_400_000),
    recommendedPriorityFee: Math.ceil(avgFee * 1.5), // 50% above average
  };
}
```

---

## Transaction Composition

### Transaction Builder Hook

```tsx
// hooks/useTransactionBuilder.ts
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';

interface TransactionBuilderOptions {
  computeUnits?: number;
  priorityFee?: number;
  skipPreflight?: boolean;
}

export function useTransactionBuilder() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const buildAndSend = useCallback(
    async (
      instructions: TransactionInstruction[],
      options: TransactionBuilderOptions = {}
    ): Promise<string> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      // Add compute budget if specified
      if (options.computeUnits) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: options.computeUnits,
          })
        );
      }

      if (options.priorityFee) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: options.priorityFee,
          })
        );
      }

      // Add all instructions
      instructions.forEach((ix) => transaction.add(ix));

      // Sign
      const signed = await signTransaction(transaction);

      // Send
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: options.skipPreflight ?? false,
        preflightCommitment: 'confirmed',
      });

      // Confirm
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    },
    [connection, publicKey, signTransaction]
  );

  const buildOnly = useCallback(
    async (instructions: TransactionInstruction[]): Promise<Transaction> => {
      if (!publicKey) throw new Error('Wallet not connected');

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      instructions.forEach((ix) => transaction.add(ix));

      return transaction;
    },
    [connection, publicKey]
  );

  return { buildAndSend, buildOnly };
}
```

### Multi-Instruction Transaction Pattern

```tsx
// lib/transactionBuilder.ts
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';

interface InstructionWithPriority {
  instruction: TransactionInstruction;
  priority: 'pre' | 'main' | 'post';
}

export function composeTransaction(
  instructions: InstructionWithPriority[],
  feePayer: PublicKey,
  blockhash: string,
  lastValidBlockHeight: number
): Transaction {
  const transaction = new Transaction({
    feePayer,
    blockhash,
    lastValidBlockHeight,
  });

  // Sort by priority
  const preInstructions = instructions.filter((i) => i.priority === 'pre');
  const mainInstructions = instructions.filter((i) => i.priority === 'main');
  const postInstructions = instructions.filter((i) => i.priority === 'post');

  // Add in order
  preInstructions.forEach((i) => transaction.add(i.instruction));
  mainInstructions.forEach((i) => transaction.add(i.instruction));
  postInstructions.forEach((i) => transaction.add(i.instruction));

  return transaction;
}
```

---

## Common Patterns

### Swap Transaction

```tsx
// Example Jupiter swap transaction
async function buildSwapTransaction(
  connection: Connection,
  wallet: PublicKey,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<Transaction> {
  // Get quote from Jupiter API
  const quoteResponse = await fetch(
    `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${amount}&` +
      `slippageBps=${slippageBps}`
  ).then((r) => r.json());

  // Get swap transaction
  const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  }).then((r) => r.json());

  // Deserialize transaction
  const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  return Transaction.from(swapTransactionBuf);
}
```

### Batch Token Transfers

```tsx
async function buildBatchTransfer(
  connection: Connection,
  sender: PublicKey,
  transfers: { recipient: string; mint: string; amount: bigint }[]
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const instructions: TransactionInstruction[] = [];

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  for (const transfer of transfers) {
    const mint = new PublicKey(transfer.mint);
    const recipient = new PublicKey(transfer.recipient);

    // Get ATAs
    const senderAta = await getAssociatedTokenAddress(mint, sender);
    const recipientAta = await getAssociatedTokenAddress(mint, recipient);

    // Check if recipient ATA exists
    const { instruction: createAtaIx } = await getOrCreateAtaInstruction(
      connection,
      sender,
      mint,
      recipient
    );

    if (createAtaIx) {
      instructions.push(createAtaIx);
    }

    instructions.push(
      createTransferInstruction(
        senderAta,
        recipientAta,
        sender,
        transfer.amount
      )
    );

    // Split into multiple transactions if too many instructions
    if (instructions.length >= 10) {
      const tx = new Transaction({
        feePayer: sender,
        blockhash,
        lastValidBlockHeight,
      });
      instructions.forEach((ix) => tx.add(ix));
      transactions.push(tx);
      instructions.length = 0;
    }
  }

  // Add remaining instructions
  if (instructions.length > 0) {
    const tx = new Transaction({
      feePayer: sender,
      blockhash,
      lastValidBlockHeight,
    });
    instructions.forEach((ix) => tx.add(ix));
    transactions.push(tx);
  }

  return transactions;
}
```

---

## Best Practices

1. **Always add compute budget instructions first** - They must be before other instructions
2. **Check for required pre-instructions** - ATAs, account creation, etc.
3. **Use fresh blockhash** - Don't cache blockhash for too long
4. **Estimate compute units** - Don't use default 200k for complex transactions
5. **Handle simulation errors** - Parse and show meaningful errors
6. **Batch related operations** - Combine multiple instructions when possible

---

## External Resources

- [Solana Transaction Docs](https://solana.com/docs/core/transactions)
- [SPL Token JS](https://spl.solana.com/token#usage)
- [Anchor Client TypeScript](https://www.anchor-lang.com/docs/client)
- [Jupiter API Docs](https://station.jup.ag/docs/)
