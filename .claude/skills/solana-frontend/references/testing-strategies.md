# Testing Strategies

Patterns for testing Solana dApp frontends including unit tests, integration tests, and E2E testing with mock wallets and connections.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Mock Providers](#mock-providers)
3. [Hook Testing](#hook-testing)
4. [Component Testing](#component-testing)
5. [E2E Testing](#e2e-testing)

---

## Testing Setup

### Jest Configuration

```js
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@solana|@coral-xyz|@metaplex)/)',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Jest Setup

```tsx
// jest.setup.ts
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for web3.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {},
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Suppress console during tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
```

### Test Utilities

```tsx
// test/utils.tsx
import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

export function createWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: createWrapper(), ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

---

## Mock Providers

### Mock Connection

```tsx
// test/mocks/connection.ts
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';

export function createMockConnection(overrides: Partial<Connection> = {}): Connection {
  const mockConnection = {
    getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mockBlockhash123456789',
      lastValidBlockHeight: 1000,
    }),
    getSlot: jest.fn().mockResolvedValue(12345),
    sendRawTransaction: jest.fn().mockResolvedValue('mockSignature'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    simulateTransaction: jest.fn().mockResolvedValue({
      value: { err: null, logs: [], unitsConsumed: 50000 },
    }),
    onAccountChange: jest.fn().mockReturnValue(1),
    removeAccountChangeListener: jest.fn(),
    ...overrides,
  };

  return mockConnection as unknown as Connection;
}

// Mock connection context
export const MockConnectionContext = {
  connection: createMockConnection(),
};
```

### Mock Wallet

```tsx
// test/mocks/wallet.ts
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export const MOCK_WALLET_ADDRESS = new PublicKey(
  'MockWa11etPubkey11111111111111111111111111111'
);

export function createMockWallet(
  overrides: Partial<WalletContextState> = {}
): WalletContextState {
  return {
    publicKey: MOCK_WALLET_ADDRESS,
    connected: true,
    connecting: false,
    disconnecting: false,
    autoConnect: false,
    wallet: {
      adapter: {
        name: 'Mock Wallet',
        url: 'https://mockwallet.com',
        icon: '',
        readyState: 4, // Installed
        publicKey: MOCK_WALLET_ADDRESS,
        connecting: false,
        connected: true,
        supportedTransactionVersions: new Set(['legacy', 0]),
      } as any,
      readyState: 4,
    },
    wallets: [],
    select: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendTransaction: jest.fn().mockResolvedValue('mockSignature'),
    signTransaction: jest.fn().mockImplementation(async (tx) => tx),
    signAllTransactions: jest.fn().mockImplementation(async (txs) => txs),
    signMessage: jest.fn().mockResolvedValue(new Uint8Array(64)),
    signIn: jest.fn(),
    ...overrides,
  };
}

// Disconnected wallet
export const mockDisconnectedWallet = createMockWallet({
  publicKey: null,
  connected: false,
  wallet: null,
});
```

### Mock Provider Wrapper

```tsx
// test/mocks/providers.tsx
import { ReactNode } from 'react';
import { ConnectionContext, WalletContext } from '@solana/wallet-adapter-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockConnection, MockConnectionContext } from './connection';
import { createMockWallet, mockDisconnectedWallet } from './wallet';

interface MockProvidersProps {
  children: ReactNode;
  walletConnected?: boolean;
  connectionOverrides?: Partial<Connection>;
  walletOverrides?: Partial<WalletContextState>;
}

export function MockProviders({
  children,
  walletConnected = true,
  connectionOverrides = {},
  walletOverrides = {},
}: MockProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const mockConnection = createMockConnection(connectionOverrides);
  const mockWallet = walletConnected
    ? createMockWallet(walletOverrides)
    : mockDisconnectedWallet;

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionContext.Provider value={{ connection: mockConnection }}>
        <WalletContext.Provider value={mockWallet}>
          {children}
        </WalletContext.Provider>
      </ConnectionContext.Provider>
    </QueryClientProvider>
  );
}
```

---

## Hook Testing

### Testing Data Hooks

```tsx
// __tests__/hooks/useSolBalance.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useSolBalance } from '@/hooks/data/useSolBalance';
import { MockProviders } from '@/test/mocks/providers';
import { createMockConnection } from '@/test/mocks/connection';

describe('useSolBalance', () => {
  it('returns balance when wallet is connected', async () => {
    const mockBalance = 5000000000; // 5 SOL
    const mockConnection = createMockConnection({
      getBalance: jest.fn().mockResolvedValue(mockBalance),
    });

    const { result } = renderHook(() => useSolBalance(), {
      wrapper: ({ children }) => (
        <MockProviders
          walletConnected={true}
          connectionOverrides={{ getBalance: mockConnection.getBalance }}
        >
          {children}
        </MockProviders>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(mockBalance);
  });

  it('does not fetch when wallet is disconnected', async () => {
    const getBalance = jest.fn();

    const { result } = renderHook(() => useSolBalance(), {
      wrapper: ({ children }) => (
        <MockProviders
          walletConnected={false}
          connectionOverrides={{ getBalance }}
        >
          {children}
        </MockProviders>
      ),
    });

    // Wait a bit to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getBalance).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('handles errors gracefully', async () => {
    const mockConnection = createMockConnection({
      getBalance: jest.fn().mockRejectedValue(new Error('RPC error')),
    });

    const { result } = renderHook(() => useSolBalance(), {
      wrapper: ({ children }) => (
        <MockProviders
          walletConnected={true}
          connectionOverrides={{ getBalance: mockConnection.getBalance }}
        >
          {children}
        </MockProviders>
      ),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('RPC error');
  });
});
```

### Testing Transaction Hooks

```tsx
// __tests__/hooks/useTransfer.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransfer } from '@/hooks/useTransfer';
import { MockProviders } from '@/test/mocks/providers';
import { PublicKey } from '@solana/web3.js';

describe('useTransfer', () => {
  const recipient = new PublicKey('RecipientPubkey11111111111111111111111');

  it('executes transfer successfully', async () => {
    const expectedSignature = 'mockSignature123';
    const sendTransaction = jest.fn().mockResolvedValue(expectedSignature);

    const { result } = renderHook(() => useTransfer(), {
      wrapper: ({ children }) => (
        <MockProviders walletOverrides={{ sendTransaction }}>
          {children}
        </MockProviders>
      ),
    });

    let signature: string | undefined;
    await act(async () => {
      signature = await result.current.transfer(recipient, 1);
    });

    expect(signature).toBe(expectedSignature);
    expect(sendTransaction).toHaveBeenCalled();
  });

  it('throws when wallet not connected', async () => {
    const { result } = renderHook(() => useTransfer(), {
      wrapper: ({ children }) => (
        <MockProviders walletConnected={false}>
          {children}
        </MockProviders>
      ),
    });

    await expect(result.current.transfer(recipient, 1)).rejects.toThrow(
      'Wallet not connected'
    );
  });
});
```

---

## Component Testing

### Testing Form Components

```tsx
// __tests__/components/TransferForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransferForm } from '@/components/forms/TransferForm';
import { MockProviders } from '@/test/mocks/providers';

describe('TransferForm', () => {
  it('renders form fields', () => {
    render(
      <MockProviders>
        <TransferForm />
      </MockProviders>
    );

    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('validates recipient address', async () => {
    const user = userEvent.setup();

    render(
      <MockProviders>
        <TransferForm />
      </MockProviders>
    );

    const recipientInput = screen.getByLabelText(/recipient/i);
    await user.type(recipientInput, 'invalid-address');
    await user.tab(); // Blur to trigger validation

    await waitFor(() => {
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });
  });

  it('validates amount is positive', async () => {
    const user = userEvent.setup();

    render(
      <MockProviders>
        <TransferForm />
      </MockProviders>
    );

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, '-1');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
    });
  });

  it('disables submit when wallet disconnected', () => {
    render(
      <MockProviders walletConnected={false}>
        <TransferForm />
      </MockProviders>
    );

    const submitButton = screen.getByRole('button', { name: /send/i });
    expect(submitButton).toBeDisabled();
  });

  it('submits form successfully', async () => {
    const user = userEvent.setup();
    const sendTransaction = jest.fn().mockResolvedValue('mockSig');

    render(
      <MockProviders walletOverrides={{ sendTransaction }}>
        <TransferForm />
      </MockProviders>
    );

    // Fill form
    await user.type(
      screen.getByLabelText(/recipient/i),
      'RecipientPubkey11111111111111111111111'
    );
    await user.type(screen.getByLabelText(/amount/i), '1');

    // Submit
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(sendTransaction).toHaveBeenCalled();
    });
  });
});
```

### Testing Wallet Components

```tsx
// __tests__/components/WalletButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { MockProviders } from '@/test/mocks/providers';

describe('WalletButton', () => {
  it('shows connect button when disconnected', () => {
    render(
      <MockProviders walletConnected={false}>
        <WalletButton />
      </MockProviders>
    );

    expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
  });

  it('shows address when connected', () => {
    render(
      <MockProviders walletConnected={true}>
        <WalletButton />
      </MockProviders>
    );

    // Should show truncated address
    expect(screen.getByText(/Mock\.\.\.1111/i)).toBeInTheDocument();
  });

  it('calls connect on click when disconnected', () => {
    const connect = jest.fn();

    render(
      <MockProviders walletConnected={false} walletOverrides={{ connect }}>
        <WalletButton />
      </MockProviders>
    );

    fireEvent.click(screen.getByText(/connect wallet/i));
    expect(connect).toHaveBeenCalled();
  });
});
```

---

## E2E Testing

### Playwright Configuration

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Mock Wallet Extension

```ts
// e2e/fixtures/wallet.ts
import { Page } from '@playwright/test';

export async function injectMockWallet(page: Page) {
  await page.addInitScript(() => {
    // Mock Phantom wallet
    (window as any).solana = {
      isPhantom: true,
      publicKey: {
        toBase58: () => 'MockWa11etPubkey11111111111111111111111111111',
        toBuffer: () => new Uint8Array(32),
      },
      isConnected: true,
      connect: async () => ({
        publicKey: {
          toBase58: () => 'MockWa11etPubkey11111111111111111111111111111',
        },
      }),
      disconnect: async () => {},
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
      signMessage: async () => new Uint8Array(64),
      on: () => {},
      off: () => {},
    };
  });
}
```

### E2E Test Example

```ts
// e2e/transfer.spec.ts
import { test, expect } from '@playwright/test';
import { injectMockWallet } from './fixtures/wallet';

test.describe('Transfer Page', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await page.goto('/transfer');
  });

  test('displays transfer form', async ({ page }) => {
    await expect(page.getByLabel('Recipient')).toBeVisible();
    await expect(page.getByLabel('Amount')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('shows balance after connecting', async ({ page }) => {
    await page.click('text=Connect Wallet');
    await expect(page.getByText(/SOL/)).toBeVisible();
  });

  test('validates form inputs', async ({ page }) => {
    await page.click('text=Connect Wallet');

    // Try to submit empty form
    await page.click('button:has-text("Send")');

    await expect(page.getByText(/required/i)).toBeVisible();
  });
});
```

---

## Best Practices

### 1. Isolate Tests

```tsx
// Each test should have its own QueryClient
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
```

### 2. Mock at the Right Level

```tsx
// Mock connection for unit tests
const mockConnection = createMockConnection();

// Use real connection with devnet for integration tests
const connection = new Connection('https://api.devnet.solana.com');
```

### 3. Test Error States

```tsx
it('handles RPC errors', async () => {
  const mockConnection = createMockConnection({
    getBalance: jest.fn().mockRejectedValue(new Error('RPC error')),
  });
  // ...
});
```

### 4. Test Loading States

```tsx
it('shows loading spinner while fetching', async () => {
  render(<Component />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
```

### 5. Use Realistic Mock Data

```tsx
// Use actual Solana public keys
const MOCK_ADDRESS = new PublicKey('11111111111111111111111111111111');
const MOCK_BALANCE = 1_000_000_000; // 1 SOL in lamports
```

---

## External Resources

- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)
- [Jest](https://jestjs.io/)
- [MSW for API Mocking](https://mswjs.io/)
