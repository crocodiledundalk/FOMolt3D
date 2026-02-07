# Transaction Simulation

Patterns for simulating transactions before submission to catch errors, estimate compute units, and provide better user feedback.

## Table of Contents

1. [Simulation Fundamentals](#simulation-fundamentals)
2. [Basic Simulation](#basic-simulation)
3. [Compute Unit Estimation](#compute-unit-estimation)
4. [Error Detection](#error-detection)
5. [Simulation Hook](#simulation-hook)

---

## Simulation Fundamentals

### Why Simulate?

1. **Catch errors before signing** - Detect program errors without spending SOL
2. **Estimate compute units** - Set accurate CU limits for priority fees
3. **Preview balance changes** - Show users what will happen
4. **Validate accounts** - Ensure all accounts exist and have correct state

### Simulation vs Preflight

| Simulation | Preflight |
|------------|-----------|
| Explicit call before signing | Automatic during sendTransaction |
| Returns detailed results | Only pass/fail |
| No signature required | Requires signed transaction |
| Can test hypothetical state | Uses current state |

---

## Basic Simulation

### Simple Simulation

```tsx
// lib/transaction/simulate.ts
import {
  Connection,
  Transaction,
  VersionedTransaction,
  SimulatedTransactionResponse,
  PublicKey,
} from '@solana/web3.js';

export interface SimulationResult {
  success: boolean;
  error: string | null;
  logs: string[];
  unitsConsumed: number | null;
  returnData: { programId: string; data: string } | null;
}

export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  signers?: PublicKey[]
): Promise<SimulationResult> {
  try {
    let response: SimulatedTransactionResponse;

    if (transaction instanceof VersionedTransaction) {
      const result = await connection.simulateTransaction(transaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
      });
      response = result.value;
    } else {
      // For legacy transactions
      const result = await connection.simulateTransaction(transaction, signers);
      response = result.value;
    }

    return {
      success: response.err === null,
      error: response.err ? JSON.stringify(response.err) : null,
      logs: response.logs ?? [],
      unitsConsumed: response.unitsConsumed ?? null,
      returnData: response.returnData ?? null,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Simulation failed',
      logs: [],
      unitsConsumed: null,
      returnData: null,
    };
  }
}
```

### Simulation with Account Overrides

```tsx
// lib/transaction/simulateWithOverrides.ts
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  AccountInfo,
} from '@solana/web3.js';

interface AccountOverride {
  address: PublicKey;
  data: Buffer;
  lamports?: number;
  owner?: PublicKey;
}

export async function simulateWithAccountOverrides(
  connection: Connection,
  transaction: VersionedTransaction,
  overrides: AccountOverride[]
): Promise<SimulationResult> {
  // Convert overrides to the format expected by simulateTransaction
  const accountOverrides: Array<[PublicKey, AccountInfo<Buffer>]> = overrides.map(
    (override) => [
      override.address,
      {
        data: override.data,
        executable: false,
        lamports: override.lamports ?? 0,
        owner: override.owner ?? PublicKey.default,
        rentEpoch: 0,
      },
    ]
  );

  const result = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    accounts: {
      addresses: overrides.map((o) => o.address),
      encoding: 'base64',
    },
  });

  return {
    success: result.value.err === null,
    error: result.value.err ? JSON.stringify(result.value.err) : null,
    logs: result.value.logs ?? [],
    unitsConsumed: result.value.unitsConsumed ?? null,
    returnData: result.value.returnData ?? null,
  };
}
```

---

## Compute Unit Estimation

### Estimate CU from Simulation

```tsx
// lib/transaction/estimateComputeUnits.ts
import {
  Connection,
  Transaction,
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionInstruction,
  TransactionMessage,
  PublicKey,
} from '@solana/web3.js';

const DEFAULT_COMPUTE_UNITS = 200_000;
const COMPUTE_UNIT_BUFFER = 1.1; // 10% buffer

export async function estimateComputeUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey
): Promise<number> {
  // Create a transaction with max compute units for simulation
  const testInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000, // Max possible
    }),
    ...instructions,
  ];

  const { blockhash } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: testInstructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  const simulation = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  if (simulation.value.err) {
    // If simulation fails, return default
    console.warn('Simulation failed for CU estimation:', simulation.value.err);
    return DEFAULT_COMPUTE_UNITS;
  }

  const unitsConsumed = simulation.value.unitsConsumed ?? DEFAULT_COMPUTE_UNITS;

  // Add buffer for safety
  return Math.ceil(unitsConsumed * COMPUTE_UNIT_BUFFER);
}
```

### CU Estimation Hook

```tsx
// hooks/useComputeUnitEstimate.ts
import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransactionInstruction } from '@solana/web3.js';
import { estimateComputeUnits } from '@/lib/transaction/estimateComputeUnits';

export function useComputeUnitEstimate(
  instructions: TransactionInstruction[] | undefined,
  enabled = true
) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: [
      'computeUnitEstimate',
      instructions?.map((ix) => ix.data.toString('hex')).join(','),
      publicKey?.toBase58(),
    ],
    queryFn: async () => {
      if (!instructions || !publicKey) {
        throw new Error('Missing instructions or wallet');
      }
      return estimateComputeUnits(connection, instructions, publicKey);
    },
    enabled: enabled && !!instructions && instructions.length > 0 && !!publicKey,
    staleTime: 1000 * 30, // 30 seconds
  });
}
```

---

## Error Detection

### Parse Simulation Errors

```tsx
// lib/transaction/parseSimulationError.ts
import { TransactionError } from '@solana/web3.js';

export interface ParsedSimulationError {
  type: 'program' | 'system' | 'unknown';
  code: number | null;
  message: string;
  programId: string | null;
  logs: string[];
}

export function parseSimulationError(
  error: TransactionError | null,
  logs: string[]
): ParsedSimulationError | null {
  if (!error) return null;

  // Handle InstructionError
  if (typeof error === 'object' && 'InstructionError' in error) {
    const [index, instructionError] = (error as any).InstructionError;

    // Custom program error
    if (typeof instructionError === 'object' && 'Custom' in instructionError) {
      const errorCode = instructionError.Custom;
      const programIdFromLogs = extractProgramIdFromLogs(logs, index);

      return {
        type: 'program',
        code: errorCode,
        message: `Program error: code ${errorCode}`,
        programId: programIdFromLogs,
        logs,
      };
    }

    // System error
    return {
      type: 'system',
      code: null,
      message: typeof instructionError === 'string'
        ? instructionError
        : JSON.stringify(instructionError),
      programId: null,
      logs,
    };
  }

  return {
    type: 'unknown',
    code: null,
    message: typeof error === 'string' ? error : JSON.stringify(error),
    programId: null,
    logs,
  };
}

function extractProgramIdFromLogs(logs: string[], instructionIndex: number): string | null {
  // Find the program invoke for this instruction index
  let currentIndex = -1;
  for (const log of logs) {
    if (log.includes('invoke [1]')) {
      currentIndex++;
      if (currentIndex === instructionIndex) {
        const match = log.match(/Program (\w+) invoke/);
        return match ? match[1] : null;
      }
    }
  }
  return null;
}
```

### Anchor Error Parsing

```tsx
// lib/transaction/parseAnchorError.ts
import { AnchorError, ProgramError } from '@coral-xyz/anchor';
import { IDL } from '@/programs/myProgram';

export function parseAnchorSimulationError(
  errorCode: number,
  programId: string
): string | null {
  // Check if this is our program
  if (programId !== 'YourProgramId111111111111111111111111') {
    return null;
  }

  // Find error in IDL
  const error = IDL.errors?.find((e) => e.code === errorCode);
  if (error) {
    return error.msg;
  }

  return null;
}
```

### Pre-Submit Validation

```tsx
// lib/transaction/validateBeforeSubmit.ts
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { simulateTransaction, SimulationResult } from './simulate';
import { parseSimulationError } from './parseSimulationError';

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  computeUnits: number | null;
  logs: string[];
}

export async function validateTransaction(
  connection: Connection,
  transaction: VersionedTransaction
): Promise<ValidationResult> {
  const simulation = await simulateTransaction(connection, transaction);

  if (!simulation.success) {
    const parsed = parseSimulationError(
      simulation.error ? JSON.parse(simulation.error) : null,
      simulation.logs
    );

    return {
      valid: false,
      error: parsed?.message || simulation.error || 'Transaction simulation failed',
      computeUnits: simulation.unitsConsumed,
      logs: simulation.logs,
    };
  }

  return {
    valid: true,
    error: null,
    computeUnits: simulation.unitsConsumed,
    logs: simulation.logs,
  };
}
```

---

## Simulation Hook

### Complete Simulation Hook

```tsx
// hooks/useTransactionSimulation.ts
import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { simulateTransaction, SimulationResult } from '@/lib/transaction/simulate';
import { parseSimulationError, ParsedSimulationError } from '@/lib/transaction/parseSimulationError';

interface UseTransactionSimulationResult {
  simulate: (instructions: TransactionInstruction[]) => Promise<SimulationResult>;
  isSimulating: boolean;
  result: SimulationResult | null;
  error: ParsedSimulationError | null;
  reset: () => void;
}

export function useTransactionSimulation(): UseTransactionSimulationResult {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<ParsedSimulationError | null>(null);

  const simulate = useCallback(
    async (instructions: TransactionInstruction[]): Promise<SimulationResult> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      setIsSimulating(true);
      setError(null);

      try {
        const { blockhash } = await connection.getLatestBlockhash();

        // Add compute budget for simulation
        const simulationInstructions = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
          ...instructions,
        ];

        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: simulationInstructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        const simulationResult = await simulateTransaction(connection, transaction);

        setResult(simulationResult);

        if (!simulationResult.success) {
          const parsed = parseSimulationError(
            simulationResult.error ? JSON.parse(simulationResult.error) : null,
            simulationResult.logs
          );
          setError(parsed);
        }

        return simulationResult;
      } finally {
        setIsSimulating(false);
      }
    },
    [connection, publicKey]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    simulate,
    isSimulating,
    result,
    error,
    reset,
  };
}
```

### Usage Example

```tsx
// components/TransferForm.tsx
import { useTransactionSimulation } from '@/hooks/useTransactionSimulation';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export function TransferForm() {
  const { publicKey } = useWallet();
  const { simulate, isSimulating, result, error, reset } = useTransactionSimulation();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSimulate = async () => {
    if (!publicKey) return;

    const instruction = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
    });

    await simulate([instruction]);
  };

  return (
    <div className="space-y-4">
      <input
        value={recipient}
        onChange={(e) => {
          setRecipient(e.target.value);
          reset();
        }}
        placeholder="Recipient address"
      />
      <input
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          reset();
        }}
        placeholder="Amount in SOL"
      />

      <button onClick={handleSimulate} disabled={isSimulating}>
        {isSimulating ? 'Simulating...' : 'Preview Transaction'}
      </button>

      {result && (
        <div className={result.success ? 'text-green-600' : 'text-red-600'}>
          {result.success ? (
            <div>
              <p>Transaction will succeed</p>
              <p>Estimated compute: {result.unitsConsumed} CU</p>
            </div>
          ) : (
            <p>Error: {error?.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Always Simulate Before Expensive Operations

```tsx
// Good - Simulate first
const simulation = await simulateTransaction(connection, tx);
if (!simulation.success) {
  throw new Error(simulation.error);
}
const signature = await connection.sendRawTransaction(tx.serialize());

// Bad - Send without checking
const signature = await connection.sendRawTransaction(tx.serialize());
```

### 2. Use Simulation for CU Estimation

```tsx
// Estimate actual CU usage
const estimatedCU = await estimateComputeUnits(connection, instructions, payer);
// Add CU limit instruction
instructions.unshift(
  ComputeBudgetProgram.setComputeUnitLimit({ units: estimatedCU })
);
```

### 3. Show Simulation Results to Users

```tsx
// Preview what will happen
{simulation && (
  <div>
    <p>This transaction will:</p>
    <ul>
      <li>Transfer {amount} SOL</li>
      <li>Cost ~{simulation.unitsConsumed} compute units</li>
      <li>Fee: ~{calculateFee(simulation.unitsConsumed)} SOL</li>
    </ul>
  </div>
)}
```

### 4. Handle Simulation Failures Gracefully

```tsx
const simulation = await simulateTransaction(connection, tx);
if (!simulation.success) {
  // Parse and show user-friendly error
  const parsed = parseSimulationError(simulation.error, simulation.logs);
  toast.error(getUserFriendlyError(parsed));
  return;
}
```

### 5. Re-simulate on Input Changes

```tsx
// Debounce simulation on input changes
const debouncedSimulate = useDebouncedCallback(
  (instructions) => simulate(instructions),
  500
);

useEffect(() => {
  if (instructions.length > 0) {
    debouncedSimulate(instructions);
  }
}, [instructions]);
```

---

## External Resources

- [simulateTransaction RPC](https://solana.com/docs/rpc/http/simulatetransaction)
- [Compute Budget Program](https://solana.com/docs/core/fees#compute-budget)
- [Transaction Errors](https://solana.com/docs/rpc/http/simulatetransaction#transaction-error-codes)
