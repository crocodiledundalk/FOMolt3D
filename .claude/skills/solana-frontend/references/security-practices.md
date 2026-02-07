# Security Practices

Security best practices for Solana dApp frontends including transaction safety, input validation, and protecting user assets.

## Table of Contents

1. [Transaction Security](#transaction-security)
2. [Input Validation](#input-validation)
3. [Wallet Security](#wallet-security)
4. [API Security](#api-security)
5. [Common Vulnerabilities](#common-vulnerabilities)

---

## Transaction Security

### Transaction Preview

Always show users exactly what they're signing.

```tsx
// components/TransactionPreview.tsx
import { Transaction, VersionedTransaction } from '@solana/web3.js';

interface TransactionPreviewProps {
  transaction: Transaction | VersionedTransaction;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TransactionPreview({
  transaction,
  onConfirm,
  onCancel,
}: TransactionPreviewProps) {
  const instructions = 'version' in transaction
    ? transaction.message.compiledInstructions
    : transaction.instructions;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">Review Transaction</h3>

      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-500">Instructions:</span>
          <span className="ml-2">{instructions.length}</span>
        </div>

        <div>
          <span className="text-sm text-gray-500">Fee Payer:</span>
          <code className="ml-2 text-sm">
            {transaction.feePayer?.toBase58().slice(0, 8)}...
          </code>
        </div>

        {/* Detailed instruction breakdown */}
        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">Instructions:</p>
          {instructions.map((ix, i) => (
            <div key={i} className="text-sm bg-white p-2 rounded mb-1">
              Program: {ix.programId?.toBase58?.() || 'Unknown'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
```

### Simulation Before Signing

```tsx
// lib/security/simulateBeforeSign.ts
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

interface SimulationCheck {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export async function checkTransactionSafety(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<SimulationCheck> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const simulation = await connection.simulateTransaction(
      transaction as VersionedTransaction,
      { sigVerify: false }
    );

    if (simulation.value.err) {
      errors.push(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      return { passed: false, warnings, errors };
    }

    // Check for suspicious patterns in logs
    const logs = simulation.value.logs || [];

    // Look for ownership changes
    if (logs.some((log) => log.includes('SetAuthority'))) {
      warnings.push('This transaction changes account ownership');
    }

    // Look for token approvals
    if (logs.some((log) => log.includes('Approve'))) {
      warnings.push('This transaction approves token spending');
    }

    // Check compute units
    if (simulation.value.unitsConsumed && simulation.value.unitsConsumed > 400000) {
      warnings.push('High compute usage - may fail during congestion');
    }

    return { passed: true, warnings, errors };
  } catch (error: any) {
    errors.push(`Simulation error: ${error.message}`);
    return { passed: false, warnings, errors };
  }
}
```

### Program Allowlisting

```tsx
// lib/security/allowlist.ts
import { PublicKey } from '@solana/web3.js';

// Known safe program IDs
const ALLOWED_PROGRAMS = new Set([
  '11111111111111111111111111111111', // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  // Add your program IDs
]);

export function isAllowedProgram(programId: PublicKey | string): boolean {
  const id = typeof programId === 'string' ? programId : programId.toBase58();
  return ALLOWED_PROGRAMS.has(id);
}

export function checkTransactionPrograms(
  transaction: Transaction
): { safe: boolean; unknownPrograms: string[] } {
  const unknownPrograms: string[] = [];

  for (const ix of transaction.instructions) {
    const programId = ix.programId.toBase58();
    if (!isAllowedProgram(programId)) {
      unknownPrograms.push(programId);
    }
  }

  return {
    safe: unknownPrograms.length === 0,
    unknownPrograms,
  };
}
```

### Amount Verification

```tsx
// lib/security/verifyAmounts.ts
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface AmountCheck {
  totalSol: number;
  isHighValue: boolean;
  warning?: string;
}

const HIGH_VALUE_THRESHOLD = 10 * LAMPORTS_PER_SOL; // 10 SOL

export function checkTransactionAmounts(transaction: Transaction): AmountCheck {
  let totalLamports = 0;

  for (const ix of transaction.instructions) {
    // Check System Program transfers
    if (ix.programId.equals(SystemProgram.programId)) {
      // Parse transfer instruction
      try {
        const data = ix.data;
        if (data[0] === 2) {
          // Transfer instruction
          const lamports = data.readBigUInt64LE(4);
          totalLamports += Number(lamports);
        }
      } catch {
        // Skip unparseable instructions
      }
    }
  }

  const isHighValue = totalLamports > HIGH_VALUE_THRESHOLD;

  return {
    totalSol: totalLamports / LAMPORTS_PER_SOL,
    isHighValue,
    warning: isHighValue
      ? `This transaction transfers ${(totalLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL`
      : undefined,
  };
}
```

---

## Input Validation

### Address Validation

```tsx
// lib/validation/address.ts
import { PublicKey } from '@solana/web3.js';

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function isValidBase58(value: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(value);
}

// Validate address with additional checks
export function validateRecipientAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }

  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Invalid address length' };
  }

  if (!isValidBase58(address)) {
    return { valid: false, error: 'Invalid characters in address' };
  }

  try {
    const pubkey = new PublicKey(address);

    // Check it's not the zero address
    if (pubkey.equals(PublicKey.default)) {
      return { valid: false, error: 'Cannot send to zero address' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid Solana address' };
  }
}
```

### Amount Validation

```tsx
// lib/validation/amount.ts
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface AmountValidation {
  valid: boolean;
  error?: string;
  rawAmount?: number;
}

export function validateSolAmount(
  amount: string,
  options: {
    minSol?: number;
    maxSol?: number;
    balance?: number; // In lamports
  } = {}
): AmountValidation {
  const { minSol = 0, maxSol, balance } = options;

  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const parsed = parseFloat(amount);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (parsed <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  if (parsed < minSol) {
    return { valid: false, error: `Minimum amount is ${minSol} SOL` };
  }

  if (maxSol !== undefined && parsed > maxSol) {
    return { valid: false, error: `Maximum amount is ${maxSol} SOL` };
  }

  const lamports = Math.floor(parsed * LAMPORTS_PER_SOL);

  if (balance !== undefined) {
    // Leave some for fees
    const maxTransferable = balance - 5000; // Reserve 5000 lamports for fee
    if (lamports > maxTransferable) {
      return { valid: false, error: 'Insufficient balance' };
    }
  }

  return { valid: true, rawAmount: lamports };
}
```

### Zod Schemas

```tsx
// lib/validation/schemas.ts
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

export const solanaAddressSchema = z.string().refine(
  (val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address' }
);

export const solAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large');

export const transferFormSchema = z.object({
  recipient: solanaAddressSchema,
  amount: solAmountSchema,
  memo: z.string().max(280).optional(),
});

export const swapFormSchema = z.object({
  inputMint: solanaAddressSchema,
  outputMint: solanaAddressSchema,
  inputAmount: solAmountSchema,
  slippageBps: z.number().min(0).max(5000),
});
```

---

## Wallet Security

### Signature Request Warnings

```tsx
// components/SignatureWarning.tsx
interface SignatureWarningProps {
  messageType: 'transaction' | 'message';
  programIds?: string[];
}

export function SignatureWarning({ messageType, programIds }: SignatureWarningProps) {
  const hasUnknownPrograms = programIds?.some((id) => !isAllowedProgram(id));

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800">
            You're about to sign a {messageType}
          </p>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            <li>Only sign if you trust this website</li>
            <li>Review the transaction details carefully</li>
            {hasUnknownPrograms && (
              <li className="text-red-600 font-medium">
                Warning: Contains unknown programs
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### Sign Message Best Practices

```tsx
// lib/security/signMessage.ts
import { SigninMessage } from '@solana/wallet-standard-features';

// Create a safe sign-in message
export function createSignInMessage(
  domain: string,
  nonce: string,
  expiresAt: Date
): string {
  return [
    `${domain} wants you to sign in with your Solana account.`,
    '',
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
}

// Verify the message format before signing
export function isValidSignInMessage(message: string): boolean {
  // Should contain domain, nonce, and timestamps
  const hasNonce = message.includes('Nonce:');
  const hasTimestamp = message.includes('Issued At:');
  const hasExpiration = message.includes('Expiration Time:');

  return hasNonce && hasTimestamp && hasExpiration;
}
```

### Session Management

```tsx
// lib/security/session.ts
const SESSION_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface Session {
  publicKey: string;
  signature: string;
  expiresAt: number;
}

export function createSession(publicKey: string, signature: string): Session {
  return {
    publicKey,
    signature,
    expiresAt: Date.now() + SESSION_DURATION,
  };
}

export function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  return Date.now() < session.expiresAt;
}

export function clearSession(): void {
  localStorage.removeItem('wallet-session');
}
```

---

## API Security

### Server-Side Validation

```tsx
// app/api/transfer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Transaction } from '@solana/web3.js';
import { z } from 'zod';

const transferSchema = z.object({
  recipient: z.string().refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }),
  amount: z.number().positive().max(1000),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = transferSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error },
        { status: 400 }
      );
    }

    // Rate limiting (implement with your preferred method)
    // await checkRateLimit(request);

    // Process transfer...

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

### Environment Variable Protection

```tsx
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public variables (accessible in browser)
  NEXT_PUBLIC_RPC_URL: z.string().url(),
  NEXT_PUBLIC_NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']),

  // Server-only variables (never expose to client)
  RPC_SECRET_KEY: z.string().optional(),
  ADMIN_PRIVATE_KEY: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

// Never expose private keys to the client
export function getPublicConfig() {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
    network: process.env.NEXT_PUBLIC_NETWORK,
  };
}
```

---

## Common Vulnerabilities

### 1. Phishing Prevention

```tsx
// components/DomainCheck.tsx
import { useEffect, useState } from 'react';

const OFFICIAL_DOMAINS = ['myapp.com', 'app.myapp.com'];

export function DomainCheck() {
  const [isOfficialDomain, setIsOfficialDomain] = useState(true);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsOfficialDomain(
      OFFICIAL_DOMAINS.includes(hostname) || hostname === 'localhost'
    );
  }, []);

  if (isOfficialDomain) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center z-50">
      Warning: You may be on a phishing site. Official domain is {OFFICIAL_DOMAINS[0]}
    </div>
  );
}
```

### 2. XSS Prevention

```tsx
// lib/security/sanitize.ts
import DOMPurify from 'dompurify';

// Sanitize user input before rendering
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// Never render raw HTML
// Bad: <div dangerouslySetInnerHTML={{ __html: userInput }} />
// Good: <div>{sanitizeHtml(userInput)}</div>
```

### 3. CSRF Protection

```tsx
// lib/security/csrf.ts
import { v4 as uuidv4 } from 'uuid';

export function generateCsrfToken(): string {
  const token = uuidv4();
  sessionStorage.setItem('csrf-token', token);
  return token;
}

export function validateCsrfToken(token: string): boolean {
  const storedToken = sessionStorage.getItem('csrf-token');
  return token === storedToken;
}
```

### 4. Clipboard Hijacking Prevention

```tsx
// hooks/useSafeClipboard.ts
import { useCallback } from 'react';

export function useSafeClipboard() {
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      // Verify the copied content matches
      const copied = await navigator.clipboard.readText();
      if (copied !== text) {
        throw new Error('Clipboard was modified');
      }

      return true;
    } catch (error) {
      console.error('Clipboard error:', error);
      return false;
    }
  }, []);

  return { copyToClipboard };
}
```

---

## Security Checklist

### Before Launch

- [ ] All user inputs validated on client and server
- [ ] Transaction simulation enabled before signing
- [ ] Program allowlist implemented
- [ ] High-value transaction warnings displayed
- [ ] Environment variables properly protected
- [ ] HTTPS enforced in production
- [ ] CSP headers configured
- [ ] Rate limiting implemented

### Ongoing

- [ ] Monitor for suspicious transactions
- [ ] Keep dependencies updated
- [ ] Review third-party integrations
- [ ] Audit smart contract interactions
- [ ] Test error handling paths

---

## External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Solana Security Best Practices](https://solana.com/developers/guides/security-best-practices)
- [Web3 Security Guide](https://github.com/AmazingAng/WTF-Solidity/tree/main/S01_ReentrancyAttack)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
