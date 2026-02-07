# Error Handling

Patterns for handling errors gracefully in Next.js applications including error boundaries, API errors, and recovery strategies.

## Use When

- Implementing error boundaries for React components
- Handling API and network errors
- Creating user-friendly error messages
- Implementing retry and recovery mechanisms
- Logging and monitoring errors

---

## Error Boundaries

### App-Level Error Boundary

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 p-4 bg-muted rounded-md text-left text-sm overflow-auto max-w-lg">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Global Error Boundary

```tsx
// app/global-error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-muted-foreground">
              A critical error occurred. Please refresh the page.
            </p>
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Route-Specific Error Boundary

```tsx
// app/dashboard/error.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Dashboard Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          We couldn&apos;t load your dashboard. This might be a temporary issue.
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Not Found Pages

### App-Level Not Found

```tsx
// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl text-muted-foreground">Page not found</h2>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Dynamic Not Found

```tsx
// app/users/[id]/page.tsx
import { notFound } from 'next/navigation';

async function getUser(id: string) {
  const res = await fetch(`${process.env.API_URL}/users/${id}`);

  if (res.status === 404) {
    notFound(); // Renders the closest not-found.tsx
  }

  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }

  return res.json();
}

export default async function UserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser(params.id);
  return <UserProfile user={user} />;
}
```

---

## API Error Handling

### Custom Error Classes

```tsx
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMITED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}
```

### API Client Error Handling

```tsx
// lib/api/client.ts
import { AppError } from '@/lib/errors';

interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiErrorResponse;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'An unexpected error occurred' };
    }

    throw new AppError(
      errorData.message,
      errorData.code || 'API_ERROR',
      response.status,
      errorData.details
    );
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`/api${endpoint}`);
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  // ... other methods
};
```

### API Route Error Handler

```tsx
// lib/api/error-handler.ts
import { NextResponse } from 'next/server';
import { AppError, ValidationError } from '@/lib/errors';
import { ZodError } from 'zod';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status }
    );
  }

  // Unknown errors
  return NextResponse.json(
    {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// Usage in API route
// app/api/users/route.ts
import { handleApiError } from '@/lib/api/error-handler';

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## React Query Error Handling

### Query Error Configuration

```tsx
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppError } from '@/lib/errors';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof AppError && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            onError: (error) => {
              const message =
                error instanceof AppError
                  ? error.message
                  : 'An unexpected error occurred';
              toast.error(message);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Hook-Level Error Handling

```tsx
// lib/hooks/use-user.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppError } from '@/lib/errors';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get<User>(`/users/${id}`),
    retry: (failureCount, error) => {
      // Never retry 404s
      if (error instanceof AppError && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
```

### Error State Component

```tsx
// components/shared/query-error.tsx
'use client';

import { AppError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface QueryErrorProps {
  error: Error;
  reset?: () => void;
  className?: string;
}

export function QueryError({ error, reset, className }: QueryErrorProps) {
  const isAppError = error instanceof AppError;

  const getErrorMessage = () => {
    if (isAppError) {
      switch (error.status) {
        case 404:
          return 'The requested resource was not found.';
        case 403:
          return 'You do not have permission to access this resource.';
        case 401:
          return 'Please sign in to continue.';
        default:
          return error.message;
      }
    }
    return 'An unexpected error occurred. Please try again.';
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Error</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {getErrorMessage()}
      </p>
      {reset && (
        <Button onClick={reset} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
```

---

## Form Error Handling

### Zod Validation Errors

```tsx
// components/forms/user-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z.number().min(18, 'You must be at least 18 years old').optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      await createUser(data);
    } catch (error) {
      if (error instanceof AppError && error.code === 'EMAIL_EXISTS') {
        // Set server error on specific field
        setError('email', {
          type: 'server',
          message: 'This email is already registered',
        });
      } else {
        // Set root error for general errors
        setError('root', {
          type: 'server',
          message: 'Failed to create user. Please try again.',
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## Network Error Handling

### Offline Detection

```tsx
// lib/hooks/use-network-status.ts
'use client';

import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Offline Banner

```tsx
// components/shared/offline-banner.tsx
'use client';

import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-yellow-500 text-yellow-950 p-4 rounded-lg shadow-lg flex items-center gap-3">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-medium">You&apos;re offline</p>
          <p className="text-sm opacity-90">
            Some features may not be available
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Retry with Exponential Backoff

```tsx
// lib/utils/retry.ts
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(lastError) || attempt === maxAttempts - 1) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const data = await withRetry(
  () => fetch('/api/data').then((r) => r.json()),
  {
    maxAttempts: 3,
    shouldRetry: (error) => {
      // Only retry network errors, not 4xx
      return !(error instanceof AppError && error.status < 500);
    },
  }
);
```

---

## Error Logging

### Error Logger Service

```tsx
// lib/services/error-logger.ts
interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error, context?: ErrorContext) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorData);
    }
  }

  private async sendToMonitoring(errorData: unknown) {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  }
}

export const errorLogger = ErrorLogger.getInstance();
```

### Global Error Handler

```tsx
// lib/utils/global-error-handler.ts
import { errorLogger } from '@/lib/services/error-logger';

export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return;

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      { action: 'unhandledrejection' }
    );
  });

  // Uncaught errors
  window.addEventListener('error', (event) => {
    errorLogger.log(event.error || new Error(event.message), {
      action: 'uncaughterror',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
```

---

## Best Practices

### 1. User-Friendly Messages

```tsx
// Map technical errors to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  TIMEOUT: 'The request took too long. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item could not be found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
};

export function getUserFriendlyMessage(error: AppError): string {
  return ERROR_MESSAGES[error.code] || error.message;
}
```

### 2. Graceful Degradation

```tsx
// Show cached/stale data when fresh data fails to load
function DataDisplay() {
  const { data, error, isError } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    staleTime: 5 * 60 * 1000,
  });

  // Show stale data with warning if fresh fetch failed
  if (isError && data) {
    return (
      <>
        <Alert variant="warning">
          Unable to refresh data. Showing cached version.
        </Alert>
        <DataView data={data} />
      </>
    );
  }

  if (isError) {
    return <ErrorState error={error} />;
  }

  return <DataView data={data} />;
}
```

### 3. Actionable Error States

```tsx
// Always provide a path forward
<ErrorState
  title="Failed to load users"
  message="We couldn't load the user list."
  actions={[
    { label: 'Try again', onClick: refetch },
    { label: 'Contact support', href: '/support' },
  ]}
/>
```

### 4. Error Boundaries at Multiple Levels

```tsx
// app/layout.tsx - catches catastrophic errors
// app/dashboard/layout.tsx - catches dashboard errors
// Component level - catches component-specific errors
```

---

## External Resources

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [TanStack Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-retries)
