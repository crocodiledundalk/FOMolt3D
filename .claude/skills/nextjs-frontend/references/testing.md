# Testing

Patterns for testing Next.js applications including unit tests, integration tests, and end-to-end tests.

## Use When

- Writing unit tests for components and hooks
- Testing API routes and server actions
- Implementing integration tests
- Setting up end-to-end testing
- Testing forms and user interactions

---

## Setup

### Install Dependencies

```bash
# Testing libraries
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom

# For Next.js specific testing
npm install -D @vitejs/plugin-react jsdom

# For E2E testing
npm install -D playwright @playwright/test
```

### Vitest Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Test Setup File

```ts
// test/setup.ts
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

---

## Unit Testing Components

### Basic Component Test

```tsx
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/link">Link</a>
      </Button>
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
```

### Testing with Context

```tsx
// test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/providers/theme-provider';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

```tsx
// components/features/users/user-card.test.tsx
import { render, screen } from '@/test/utils';
import { UserCard } from './user-card';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
};

describe('UserCard', () => {
  it('displays user information', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
```

---

## Testing Hooks

### Custom Hook Testing

```tsx
// lib/hooks/use-counter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

### Testing Async Hooks

```tsx
// lib/hooks/use-users.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useUsers } from './use-users';

const mockUsers = [
  { id: '1', name: 'John' },
  { id: '2', name: 'Jane' },
];

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue(mockUsers),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUsers', () => {
  it('fetches and returns users', async () => {
    const { result } = renderHook(() => useUsers(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsers);
  });
});
```

---

## Testing Forms

### Form Validation Testing

```tsx
// components/forms/user-form.test.tsx
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UserForm } from './user-form';

describe('UserForm', () => {
  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<UserForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<UserForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<UserForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise((r) => setTimeout(r, 100)));

    render(<UserForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });
});
```

---

## Testing API Routes

### API Route Testing

```tsx
// app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('returns list of users', async () => {
      const mockUsers = [{ id: '1', name: 'John' }];
      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
    });
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      const newUser = { name: 'John', email: 'john@example.com' };
      const createdUser = { id: '1', ...newUser };
      vi.mocked(db.user.create).mockResolvedValue(createdUser);

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(createdUser);
    });

    it('returns 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

---

## Integration Testing

### Page Integration Test

```tsx
// app/dashboard/page.test.tsx
import { render, screen, waitFor } from '@/test/utils';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from './page';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockImplementation((endpoint) => {
      if (endpoint === '/stats') {
        return Promise.resolve({ users: 100, revenue: 50000 });
      }
      if (endpoint === '/users') {
        return Promise.resolve([{ id: '1', name: 'John' }]);
      }
      return Promise.resolve({});
    }),
  },
}));

describe('DashboardPage', () => {
  it('displays stats and user list', async () => {
    render(<DashboardPage />);

    // Initially shows loading
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // After loading, shows stats
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // users count
      expect(screen.getByText('John')).toBeInTheDocument(); // user name
    });
  });
});
```

---

## E2E Testing with Playwright

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
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```ts
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can log in', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    // First log in
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Then log out
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Log out');

    await expect(page).toHaveURL('/login');
  });
});
```

```ts
// e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Users Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can view users list', async ({ page }) => {
    await page.goto('/users');

    await expect(page.locator('h1')).toHaveText('Users');
    await expect(page.locator('table')).toBeVisible();
  });

  test('can create a new user', async ({ page }) => {
    await page.goto('/users/new');

    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=User created')).toBeVisible();
    await expect(page).toHaveURL('/users');
  });

  test('can delete a user', async ({ page }) => {
    await page.goto('/users');

    // Click delete on first user
    await page.click('[data-testid="user-actions-1"]');
    await page.click('text=Delete');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=User deleted')).toBeVisible();
  });
});
```

---

## Testing Utilities

### Mock Data Factories

```ts
// test/factories.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createUsers(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides));
}

export function createProject(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['active', 'completed', 'archived']),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}
```

### Custom Matchers

```ts
// test/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
```

---

## Best Practices

### 1. Test User Behavior, Not Implementation

```tsx
// Good - tests user behavior
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

// Avoid - tests implementation details
expect(component.state.isSubmitting).toBe(true);
```

### 2. Use Testing Library Queries Properly

```tsx
// Priority order (highest to lowest):
// 1. getByRole - most accessible
// 2. getByLabelText - form fields
// 3. getByPlaceholderText
// 4. getByText - non-interactive elements
// 5. getByTestId - last resort
```

### 3. Avoid Testing Implementation Details

```tsx
// Good
await user.click(screen.getByRole('button'));
expect(screen.getByText('Success')).toBeInTheDocument();

// Avoid
expect(mockFunction).toHaveBeenCalledTimes(1);
```

### 4. Use data-testid Sparingly

```tsx
// Only when no accessible query works
<div data-testid="user-avatar">{/* ... */}</div>
```

### 5. Test Edge Cases

```tsx
// Empty states
// Error states
// Loading states
// Boundary values
```

---

## External Resources

- [Testing Library](https://testing-library.com/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [React Testing Recipes](https://react.dev/learn/testing)
