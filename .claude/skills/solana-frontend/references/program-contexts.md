# Program Contexts

Patterns for integrating Anchor programs with frontend applications, including IDL-based type generation, account parsing, and program instance management.

## Table of Contents

1. [Program Setup](#program-setup)
2. [IDL Management](#idl-management)
3. [Account Fetching](#account-fetching)
4. [Account Subscriptions](#account-subscriptions)
5. [Program Context Pattern](#program-context-pattern)

---

## Program Setup

### Program Instance Hook

```tsx
// hooks/useProgram.ts
import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// Import your generated IDL type
import { MyProgram, IDL } from '@/programs/myProgram';

const PROGRAM_ID = new PublicKey('YourProgramId111111111111111111111111');

export function useProgram(): Program<MyProgram> | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return new Program<MyProgram>(IDL, PROGRAM_ID, provider);
  }, [connection, wallet]);
}

// Read-only program instance (no wallet required)
export function useReadOnlyProgram(): Program<MyProgram> {
  const { connection } = useConnection();

  return useMemo(() => {
    // Create a dummy wallet for read-only operations
    const readOnlyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async () => { throw new Error('Read-only'); },
      signAllTransactions: async () => { throw new Error('Read-only'); },
    };

    const provider = new AnchorProvider(
      connection,
      readOnlyWallet as any,
      { commitment: 'confirmed' }
    );

    return new Program<MyProgram>(IDL, PROGRAM_ID, provider);
  }, [connection]);
}
```

### Multiple Programs

```tsx
// hooks/usePrograms.ts
import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { StakingProgram, IDL as StakingIDL } from '@/programs/staking';
import { SwapProgram, IDL as SwapIDL } from '@/programs/swap';

const STAKING_PROGRAM_ID = new PublicKey('Staking111111111111111111111111111');
const SWAP_PROGRAM_ID = new PublicKey('Swap1111111111111111111111111111111');

export function usePrograms() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey) {
      return { staking: null, swap: null };
    }

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return {
      staking: new Program<StakingProgram>(StakingIDL, STAKING_PROGRAM_ID, provider),
      swap: new Program<SwapProgram>(SwapIDL, SWAP_PROGRAM_ID, provider),
    };
  }, [connection, wallet]);
}
```

---

## IDL Management

### Type Generation

```bash
# Generate TypeScript types from IDL
# After building your Anchor program:
anchor build

# IDL is output to target/idl/my_program.json
# Types are in target/types/my_program.ts
```

### IDL Organization

```tsx
// programs/myProgram/index.ts
export { IDL } from './idl';
export type { MyProgram } from './types';
export * from './accounts';
export * from './instructions';
export * from './pdas';

// programs/myProgram/idl.ts
import type { MyProgram } from './types';

export const IDL: MyProgram = {
  version: '0.1.0',
  name: 'my_program',
  instructions: [
    // ... IDL content
  ],
  accounts: [
    // ...
  ],
  // ...
};

// programs/myProgram/types.ts
// Copy from target/types/my_program.ts
export type MyProgram = {
  version: '0.1.0';
  name: 'my_program';
  instructions: [...];
  accounts: [...];
};
```

### PDA Derivation

```tsx
// programs/myProgram/pdas.ts
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('YourProgramId111111111111111111111111');

export function getUserAccountPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), user.toBuffer()],
    PROGRAM_ID
  );
}

export function getPoolPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), mint.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultPda(pool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), pool.toBuffer()],
    PROGRAM_ID
  );
}

// With additional seeds
export function getPositionPda(
  user: PublicKey,
  pool: PublicKey,
  positionId: number
): [PublicKey, number] {
  const positionIdBuffer = Buffer.alloc(8);
  positionIdBuffer.writeBigUInt64LE(BigInt(positionId));

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('position'),
      user.toBuffer(),
      pool.toBuffer(),
      positionIdBuffer,
    ],
    PROGRAM_ID
  );
}
```

---

## Account Fetching

### Basic Account Hook

```tsx
// hooks/data/useProgramAccount.ts
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useReadOnlyProgram } from '@/hooks/useProgram';

export function usePool(poolAddress: string | PublicKey | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['pool', poolAddress?.toString()],
    queryFn: async () => {
      if (!poolAddress) throw new Error('No pool address');
      const address = typeof poolAddress === 'string'
        ? new PublicKey(poolAddress)
        : poolAddress;
      return program.account.pool.fetch(address);
    },
    enabled: !!poolAddress,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUserAccount(userPubkey: PublicKey | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['userAccount', userPubkey?.toBase58()],
    queryFn: async () => {
      if (!userPubkey) throw new Error('No user');
      const [pda] = getUserAccountPda(userPubkey);

      try {
        return await program.account.userAccount.fetch(pda);
      } catch (error: any) {
        // Account doesn't exist yet
        if (error.message?.includes('Account does not exist')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!userPubkey,
  });
}
```

### Multiple Accounts

```tsx
// hooks/data/useAllPools.ts
import { useQuery } from '@tanstack/react-query';
import { useReadOnlyProgram } from '@/hooks/useProgram';

export function useAllPools() {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['allPools'],
    queryFn: async () => {
      const pools = await program.account.pool.all();
      return pools.map((p) => ({
        publicKey: p.publicKey,
        account: p.account,
      }));
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

// With filters
export function usePoolsByOwner(owner: PublicKey | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['poolsByOwner', owner?.toBase58()],
    queryFn: async () => {
      if (!owner) throw new Error('No owner');

      const pools = await program.account.pool.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: owner.toBase58(),
          },
        },
      ]);

      return pools;
    },
    enabled: !!owner,
  });
}
```

### Account with Derived Addresses

```tsx
// hooks/data/usePoolWithVault.ts
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useReadOnlyProgram } from '@/hooks/useProgram';
import { getVaultPda } from '@/programs/myProgram/pdas';

interface PoolWithVault {
  pool: PoolAccount;
  vault: {
    address: PublicKey;
    balance: number;
  };
}

export function usePoolWithVault(poolAddress: string | undefined) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ['poolWithVault', poolAddress],
    queryFn: async (): Promise<PoolWithVault> => {
      if (!poolAddress) throw new Error('No pool');

      const poolPubkey = new PublicKey(poolAddress);
      const [vaultPda] = getVaultPda(poolPubkey);

      const [pool, vaultBalance] = await Promise.all([
        program.account.pool.fetch(poolPubkey),
        program.provider.connection.getBalance(vaultPda),
      ]);

      return {
        pool,
        vault: {
          address: vaultPda,
          balance: vaultBalance,
        },
      };
    },
    enabled: !!poolAddress,
  });
}
```

---

## Account Subscriptions

### Real-time Account Updates

```tsx
// hooks/data/usePoolSubscription.ts
import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, AccountInfo } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { useReadOnlyProgram } from '@/hooks/useProgram';

export function usePoolSubscription(poolAddress: string | undefined) {
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const program = useReadOnlyProgram();

  useEffect(() => {
    if (!poolAddress) return;

    const pubkey = new PublicKey(poolAddress);

    const subscriptionId = connection.onAccountChange(
      pubkey,
      async (accountInfo: AccountInfo<Buffer>) => {
        try {
          // Decode the account using Anchor's coder
          const decoded = program.coder.accounts.decode(
            'pool',
            accountInfo.data
          );

          // Update React Query cache
          queryClient.setQueryData(['pool', poolAddress], decoded);
        } catch (error) {
          console.error('Failed to decode account:', error);
        }
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, poolAddress, program, queryClient]);
}

// Usage
function PoolDisplay({ poolAddress }: { poolAddress: string }) {
  const { data: pool } = usePool(poolAddress);

  // Subscribe to real-time updates
  usePoolSubscription(poolAddress);

  if (!pool) return <div>Loading...</div>;

  return (
    <div>
      <p>Total Staked: {pool.totalStaked.toString()}</p>
      <p>Participants: {pool.participantCount}</p>
    </div>
  );
}
```

### Program Event Subscription

```tsx
// hooks/useEventSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProgram } from '@/hooks/useProgram';

interface DepositEvent {
  user: PublicKey;
  pool: PublicKey;
  amount: BN;
  timestamp: BN;
}

export function useDepositEventSubscription() {
  const program = useProgram();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!program) return;

    const listener = program.addEventListener(
      'DepositEvent',
      (event: DepositEvent, slot: number) => {
        console.log('Deposit event:', event, 'at slot:', slot);

        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ['pool', event.pool.toBase58()],
        });
        queryClient.invalidateQueries({
          queryKey: ['userAccount', event.user.toBase58()],
        });
      }
    );

    return () => {
      program.removeEventListener(listener);
    };
  }, [program, queryClient]);
}
```

---

## Program Context Pattern

### Full Program Context

```tsx
// contexts/ProgramContext.tsx
'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';

import { MyProgram, IDL } from '@/programs/myProgram';
import { getUserAccountPda, getPoolPda } from '@/programs/myProgram/pdas';

const PROGRAM_ID = new PublicKey('YourProgramId111111111111111111111111');

interface ProgramContextValue {
  program: Program<MyProgram> | null;
  programId: PublicKey;
  isReady: boolean;

  // PDAs
  getUserAccountPda: (user: PublicKey) => [PublicKey, number];
  getPoolPda: (mint: PublicKey) => [PublicKey, number];

  // Instructions
  buildDepositInstruction: (
    pool: PublicKey,
    amount: number
  ) => Promise<TransactionInstruction>;
  buildWithdrawInstruction: (
    pool: PublicKey,
    amount: number
  ) => Promise<TransactionInstruction>;
}

const ProgramContext = createContext<ProgramContextValue | null>(null);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return new Program<MyProgram>(IDL, PROGRAM_ID, provider);
  }, [connection, wallet]);

  useEffect(() => {
    setIsReady(!!program);
  }, [program]);

  const buildDepositInstruction = async (
    pool: PublicKey,
    amount: number
  ): Promise<TransactionInstruction> => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not ready');
    }

    const [userAccount] = getUserAccountPda(wallet.publicKey);

    return program.methods
      .deposit(new BN(amount))
      .accounts({
        user: wallet.publicKey,
        userAccount,
        pool,
      })
      .instruction();
  };

  const buildWithdrawInstruction = async (
    pool: PublicKey,
    amount: number
  ): Promise<TransactionInstruction> => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not ready');
    }

    const [userAccount] = getUserAccountPda(wallet.publicKey);

    return program.methods
      .withdraw(new BN(amount))
      .accounts({
        user: wallet.publicKey,
        userAccount,
        pool,
      })
      .instruction();
  };

  // Subscribe to program events
  useEffect(() => {
    if (!program) return;

    const depositListener = program.addEventListener(
      'DepositEvent',
      (event, slot) => {
        queryClient.invalidateQueries({ queryKey: ['pool'] });
        queryClient.invalidateQueries({ queryKey: ['userAccount'] });
      }
    );

    const withdrawListener = program.addEventListener(
      'WithdrawEvent',
      (event, slot) => {
        queryClient.invalidateQueries({ queryKey: ['pool'] });
        queryClient.invalidateQueries({ queryKey: ['userAccount'] });
      }
    );

    return () => {
      program.removeEventListener(depositListener);
      program.removeEventListener(withdrawListener);
    };
  }, [program, queryClient]);

  const value = useMemo(
    () => ({
      program,
      programId: PROGRAM_ID,
      isReady,
      getUserAccountPda,
      getPoolPda,
      buildDepositInstruction,
      buildWithdrawInstruction,
    }),
    [program, isReady]
  );

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useMyProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useMyProgram must be used within ProgramProvider');
  }
  return context;
}
```

### Usage Example

```tsx
// components/DepositForm.tsx
import { useState } from 'react';
import { useMyProgram } from '@/contexts/ProgramContext';
import { useTransaction } from '@/hooks/useTransaction';

export function DepositForm({ poolAddress }: { poolAddress: string }) {
  const [amount, setAmount] = useState('');
  const { buildDepositInstruction, isReady } = useMyProgram();
  const { execute, isLoading } = useTransaction();

  const handleDeposit = async () => {
    if (!isReady) return;

    const pool = new PublicKey(poolAddress);
    const lamports = parseFloat(amount) * 1e9;

    const instruction = await buildDepositInstruction(pool, lamports);

    await execute({
      instructions: [instruction],
      description: 'Deposit',
    });
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in SOL"
      />
      <button
        onClick={handleDeposit}
        disabled={!isReady || isLoading}
      >
        {isLoading ? 'Depositing...' : 'Deposit'}
      </button>
    </div>
  );
}
```

---

## Best Practices

### 1. Separate Read-Only from Write Operations

```tsx
// Use read-only program for fetching
const readOnlyProgram = useReadOnlyProgram();
const pool = await readOnlyProgram.account.pool.fetch(address);

// Use wallet-connected program for transactions
const program = useProgram();
const tx = await program.methods.deposit(...).rpc();
```

### 2. Cache Account Discriminators

```tsx
// Anchor uses 8-byte discriminators
const POOL_DISCRIMINATOR = Buffer.from([/* first 8 bytes of sha256("account:Pool") */]);
```

### 3. Handle Account Not Found

```tsx
try {
  return await program.account.pool.fetch(address);
} catch (error: any) {
  if (error.message?.includes('Account does not exist')) {
    return null;
  }
  throw error;
}
```

### 4. Use Type-Safe Instructions

```tsx
// Let TypeScript infer types from IDL
const ix = await program.methods
  .deposit(new BN(amount)) // Type-checked
  .accounts({
    user: wallet.publicKey,
    pool: poolAddress,
    // Missing required accounts will error at compile time
  })
  .instruction();
```

### 5. Invalidate Queries on Events

```tsx
program.addEventListener('DepositEvent', () => {
  queryClient.invalidateQueries({ queryKey: ['pool'] });
});
```

---

## External Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Anchor TypeScript Client](https://www.anchor-lang.com/docs/javascript-anchor-types)
- [Program Derived Addresses](https://solanacookbook.com/core-concepts/pdas.html)
- [Anchor Events](https://www.anchor-lang.com/docs/events)
