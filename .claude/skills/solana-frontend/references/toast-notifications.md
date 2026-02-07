# Toast Notifications

Patterns for providing user feedback during transaction lifecycle using toast notifications. Covers setup, transaction states, and best practices.

## Table of Contents

1. [Setup](#setup)
2. [Transaction Toasts](#transaction-toasts)
3. [Toast Patterns](#toast-patterns)
4. [Custom Toast Components](#custom-toast-components)
5. [Best Practices](#best-practices)

---

## Setup

### Installing Sonner

```bash
npm install sonner
```

### Provider Setup

```tsx
// app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 5000,
            classNames: {
              toast: 'bg-gray-900 border-gray-700',
              title: 'text-white',
              description: 'text-gray-400',
            },
          }}
        />
      </body>
    </html>
  );
}
```

### Custom Toaster Configuration

```tsx
// components/SolanaToaster.tsx
import { Toaster } from 'sonner';

export function SolanaToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      expand={false}
      visibleToasts={5}
      toastOptions={{
        duration: 5000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #2d2d44',
          color: '#fff',
        },
      }}
    />
  );
}
```

---

## Transaction Toasts

### Basic Transaction Toast

```tsx
import { toast } from 'sonner';

// Simple success
toast.success('Transaction confirmed');

// With explorer link
toast.success('Transaction confirmed', {
  action: {
    label: 'View',
    onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
  },
});

// Error toast
toast.error('Transaction failed', {
  description: 'Insufficient funds for this transfer',
});

// Info toast
toast.info('Transaction cancelled');
```

### Transaction Lifecycle Toasts

```tsx
// lib/transactionToasts.ts
import { toast } from 'sonner';

interface TransactionToastOptions {
  signature?: string;
  network?: 'mainnet-beta' | 'devnet';
  description?: string;
}

export const transactionToasts = {
  // When transaction is sent
  pending: (options?: TransactionToastOptions): string | number => {
    return toast.loading('Transaction pending...', {
      description: options?.description || 'Waiting for confirmation',
    });
  },

  // When transaction is confirmed
  success: (signature: string, toastId?: string | number, options?: TransactionToastOptions) => {
    const network = options?.network || 'mainnet-beta';
    const baseUrl = network === 'devnet'
      ? 'https://solscan.io/tx/'
      : 'https://solscan.io/tx/';

    toast.success('Transaction confirmed', {
      id: toastId,
      description: options?.description,
      action: {
        label: 'View',
        onClick: () => window.open(`${baseUrl}${signature}?cluster=${network}`, '_blank'),
      },
    });
  },

  // When transaction fails
  error: (message: string, toastId?: string | number, options?: TransactionToastOptions) => {
    toast.error(message, {
      id: toastId,
      description: options?.description,
      duration: 8000, // Longer for errors
    });
  },

  // User cancelled
  cancelled: (toastId?: string | number) => {
    toast.info('Transaction cancelled', {
      id: toastId,
      duration: 3000,
    });
  },

  // Waiting for wallet
  signing: (): string | number => {
    return toast.loading('Waiting for wallet...', {
      description: 'Please confirm in your wallet',
    });
  },
};
```

### Using Transaction Toasts

```tsx
// hooks/useTransactionWithToasts.ts
import { useMutation } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { transactionToasts } from '@/lib/transactionToasts';
import { parseTransactionError } from '@/lib/errorParser';

export function useTransactionWithToasts() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  return useMutation({
    mutationFn: async (instructions: TransactionInstruction[]) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Show signing toast
      const signingToastId = transactionToasts.signing();

      try {
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const transaction = new Transaction({
          feePayer: publicKey,
          blockhash,
          lastValidBlockHeight,
        });
        instructions.forEach((ix) => transaction.add(ix));

        // Sign
        const signed = await signTransaction(transaction);

        // Update to pending
        transactionToasts.pending({ description: 'Broadcasting transaction' });

        // Send
        const signature = await connection.sendRawTransaction(signed.serialize());

        // Show pending with signature
        const pendingToastId = transactionToasts.pending();

        // Confirm
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        // Success!
        transactionToasts.success(signature, pendingToastId);

        return signature;
      } catch (error) {
        // Parse and show error
        const parsed = parseTransactionError(error);

        if (parsed.type === 'wallet') {
          transactionToasts.cancelled(signingToastId);
        } else {
          transactionToasts.error(parsed.message, signingToastId, {
            description: parsed.details,
          });
        }

        throw error;
      }
    },
  });
}
```

---

## Toast Patterns

### Promise-Based Toast

```tsx
// Using toast.promise for automatic state management
async function executeTransaction() {
  await toast.promise(
    async () => {
      const signature = await sendTransaction();
      return signature;
    },
    {
      loading: 'Sending transaction...',
      success: (signature) => ({
        message: 'Transaction confirmed',
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      }),
      error: (err) => parseTransactionError(err).message,
    }
  );
}
```

### Multi-Step Transaction Toast

```tsx
// For complex transactions with multiple steps
async function executeMultiStepTransaction() {
  const toastId = toast.loading('Step 1/3: Preparing transaction...');

  try {
    // Step 1
    await prepareTransaction();
    toast.loading('Step 2/3: Signing transaction...', { id: toastId });

    // Step 2
    const signed = await signTransaction();
    toast.loading('Step 3/3: Confirming...', { id: toastId });

    // Step 3
    const signature = await confirmTransaction(signed);

    toast.success('All steps completed!', {
      id: toastId,
      description: 'Transaction confirmed',
    });

    return signature;
  } catch (error) {
    toast.error('Transaction failed', { id: toastId });
    throw error;
  }
}
```

### Buffered/Persistent Toast

```tsx
// Toast that stays until dismissed or updated
function usePersistentTransactionToast() {
  const [toastId, setToastId] = useState<string | number | null>(null);

  const showPending = (message: string) => {
    const id = toast.loading(message, {
      duration: Infinity, // Never auto-dismiss
    });
    setToastId(id);
    return id;
  };

  const updateToSuccess = (signature: string) => {
    if (toastId) {
      toast.success('Transaction confirmed', {
        id: toastId,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });
      setToastId(null);
    }
  };

  const updateToError = (message: string) => {
    if (toastId) {
      toast.error(message, {
        id: toastId,
        duration: 8000,
      });
      setToastId(null);
    }
  };

  const dismiss = () => {
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  return {
    showPending,
    updateToSuccess,
    updateToError,
    dismiss,
  };
}
```

---

## Custom Toast Components

### Transaction Toast with Details

```tsx
// components/TransactionToast.tsx
import { toast } from 'sonner';
import { truncateAddress } from '@/lib/utils';

interface TransactionToastProps {
  signature: string;
  type: 'transfer' | 'swap' | 'stake' | 'custom';
  details?: {
    amount?: string;
    token?: string;
    recipient?: string;
  };
  network?: 'mainnet-beta' | 'devnet';
}

export function showTransactionToast({
  signature,
  type,
  details,
  network = 'mainnet-beta',
}: TransactionToastProps) {
  const getTitle = () => {
    switch (type) {
      case 'transfer':
        return `Sent ${details?.amount} ${details?.token}`;
      case 'swap':
        return 'Swap completed';
      case 'stake':
        return 'Stake successful';
      default:
        return 'Transaction confirmed';
    }
  };

  const getDescription = () => {
    if (type === 'transfer' && details?.recipient) {
      return `To ${truncateAddress(details.recipient)}`;
    }
    return `Signature: ${truncateAddress(signature)}`;
  };

  toast.success(getTitle(), {
    description: getDescription(),
    action: {
      label: 'View',
      onClick: () => {
        const baseUrl = network === 'devnet'
          ? 'https://solscan.io/tx/'
          : 'https://solscan.io/tx/';
        window.open(`${baseUrl}${signature}?cluster=${network}`, '_blank');
      },
    },
  });
}
```

### Rich Transaction Toast

```tsx
// components/RichTransactionToast.tsx
import { toast } from 'sonner';

interface RichToastData {
  title: string;
  description?: string;
  signature: string;
  network: string;
  icon?: React.ReactNode;
  details?: { label: string; value: string }[];
}

export function showRichTransactionToast(data: RichToastData) {
  toast.custom((id) => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        {data.icon && <div className="text-2xl">{data.icon}</div>}

        <div className="flex-1">
          <h3 className="font-semibold text-white">{data.title}</h3>

          {data.description && (
            <p className="text-sm text-gray-400 mt-1">{data.description}</p>
          )}

          {data.details && (
            <div className="mt-2 space-y-1">
              {data.details.map((detail) => (
                <div key={detail.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="text-gray-300">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <a
              href={`https://solscan.io/tx/${data.signature}?cluster=${data.network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              View on Explorer →
            </a>
            <button
              onClick={() => toast.dismiss(id)}
              className="text-xs text-gray-500 hover:text-gray-400 ml-auto"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  ), {
    duration: 8000,
  });
}
```

### Error Toast with Retry

```tsx
// components/ErrorToastWithRetry.tsx
import { toast } from 'sonner';

interface ErrorToastProps {
  message: string;
  description?: string;
  onRetry?: () => void;
  errorCode?: number;
}

export function showErrorToastWithRetry({
  message,
  description,
  onRetry,
  errorCode,
}: ErrorToastProps) {
  toast.custom((id) => (
    <div className="bg-red-950 border border-red-800 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">❌</span>

        <div className="flex-1">
          <h3 className="font-semibold text-red-200">{message}</h3>

          {description && (
            <p className="text-sm text-red-300/80 mt-1">{description}</p>
          )}

          {errorCode !== undefined && (
            <p className="text-xs text-red-400/60 mt-1">
              Error code: {errorCode}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {onRetry && (
              <button
                onClick={() => {
                  toast.dismiss(id);
                  onRetry();
                }}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => toast.dismiss(id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  ), {
    duration: 10000,
  });
}
```

---

## Best Practices

### 1. Consistent Messaging

```tsx
// Define standard messages
const TOAST_MESSAGES = {
  pending: 'Transaction pending...',
  signing: 'Waiting for wallet...',
  confirmed: 'Transaction confirmed',
  failed: 'Transaction failed',
  cancelled: 'Transaction cancelled',
  timeout: 'Transaction timed out',
};
```

### 2. Include Explorer Links

```tsx
// Always provide a way to verify on explorer
toast.success('Transaction confirmed', {
  action: {
    label: 'View',
    onClick: () => window.open(explorerUrl, '_blank'),
  },
});
```

### 3. Appropriate Duration

```tsx
// Success: 5 seconds (default)
toast.success('Done!'); // 5000ms

// Error: longer so user can read
toast.error('Failed', { duration: 8000 });

// Info: shorter
toast.info('Cancelled', { duration: 3000 });

// Loading: until updated
toast.loading('Pending...'); // Stays until dismissed
```

### 4. Don't Spam Toasts

```tsx
// Update existing toast instead of creating new ones
const toastId = toast.loading('Step 1...');
toast.loading('Step 2...', { id: toastId }); // Updates, doesn't create new
toast.success('Done!', { id: toastId });
```

### 5. Handle Edge Cases

```tsx
// User rejection isn't an error
if (error.type === 'wallet') {
  toast.info('Transaction cancelled'); // Not toast.error
}

// Rate limits
if (error.type === 'network') {
  toast.warning('Network busy, please try again');
}
```

### 6. Mobile Considerations

```tsx
// Use bottom position for mobile-friendly toasts
<Toaster position="bottom-center" />

// Keep messages short for small screens
toast.success('Sent!'); // Not "Your transaction has been successfully confirmed"
```

---

## External Resources

- [Sonner Documentation](https://sonner.emilkowal.ski/)
- [React Hot Toast](https://react-hot-toast.com/) (alternative)
- [Solscan Explorer](https://solscan.io/)
