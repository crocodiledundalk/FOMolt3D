# Loading States

Patterns for implementing loading states including skeletons, spinners, and React Suspense boundaries.

## Use When

- Displaying loading indicators during data fetching
- Creating skeleton screens for better perceived performance
- Implementing suspense boundaries for streaming
- Handling loading states in forms and buttons
- Creating consistent loading patterns across the app

---

## Skeleton Components

### Basic Skeleton

```tsx
// components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
```

### Skeleton Variants

```tsx
// components/shared/skeletons.tsx
import { Skeleton } from '@/components/ui/skeleton';

// Text line skeleton
export function TextSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />;
}

// Button skeleton
export function ButtonSkeleton({
  size = 'default',
}: {
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-9 w-20',
    default: 'h-10 w-24',
    lg: 'h-11 w-28',
  };

  return <Skeleton className={sizeClasses[size]} />;
}

// Input skeleton
export function InputSkeleton() {
  return <Skeleton className="h-10 w-full" />;
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
```

### Feature-Specific Skeletons

```tsx
// components/features/users/user-card-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function UserCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

// Grid of skeletons
export function UserGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Table Skeleton

```tsx
// components/features/users/user-table-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 10 }: TableSkeletonProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton
                    className={cn(
                      'h-4',
                      colIndex === 0 ? 'w-32' : 'w-20'
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Spinner Components

### Basic Spinner

```tsx
// components/ui/spinner.tsx
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  );
}
```

### Full-Page Loading

```tsx
// components/shared/loading-screen.tsx
import { Spinner } from '@/components/ui/spinner';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

### Loading Overlay

```tsx
// components/shared/loading-overlay.tsx
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
}
```

---

## Next.js Loading UI

### Route Loading

```tsx
// app/dashboard/loading.tsx
import { DashboardSkeleton } from '@/components/features/dashboard/dashboard-skeleton';

export default function Loading() {
  return <DashboardSkeleton />;
}
```

### Nested Loading

```tsx
// app/dashboard/users/loading.tsx
import { UserTableSkeleton } from '@/components/features/users/user-table-skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <UserTableSkeleton />
    </div>
  );
}
```

---

## React Suspense

### Suspense Boundaries

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UserStats } from '@/components/features/dashboard/user-stats';
import { RecentActivity } from '@/components/features/dashboard/recent-activity';
import { StatsSkeleton, ActivitySkeleton } from '@/components/skeletons';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <Suspense fallback={<StatsSkeleton />}>
        <UserStats />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}

// Server component with async data
async function UserStats() {
  const stats = await getStats(); // Server-side fetch
  return <StatsDisplay stats={stats} />;
}
```

### Suspense with Streaming

```tsx
// app/products/page.tsx
import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div>
      {/* Render immediately */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Browse our catalog</p>
      </header>

      {/* Stream when ready */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
```

### Nested Suspense Boundaries

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Each section streams independently */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <UsersChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={5} />}>
        <RecentOrders />
      </Suspense>

      <Suspense fallback={<ListSkeleton count={5} />}>
        <TopProducts />
      </Suspense>
    </div>
  );
}
```

---

## React Query Loading States

### Query Loading States

```tsx
// components/features/users/user-list.tsx
'use client';

import { useUsers } from '@/lib/hooks/use-users';
import { UserGridSkeleton } from './user-grid-skeleton';
import { QueryError } from '@/components/shared/query-error';

export function UserList() {
  const { data: users, isLoading, error, refetch } = useUsers();

  if (isLoading) {
    return <UserGridSkeleton />;
  }

  if (error) {
    return <QueryError error={error} reset={refetch} />;
  }

  if (!users?.length) {
    return <EmptyState message="No users found" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### Optimistic Loading Pattern

```tsx
// Show skeleton only on initial load, not on refetch
export function UserList() {
  const { data: users, isLoading, isFetching } = useUsers();

  // Initial load - show skeleton
  if (isLoading) {
    return <UserGridSkeleton />;
  }

  return (
    <div className="relative">
      {/* Show subtle indicator during background refetch */}
      {isFetching && (
        <div className="absolute top-0 right-0">
          <Spinner size="sm" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users?.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
```

### Placeholder Data

```tsx
// Show placeholder while loading
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    placeholderData: (previousData) => previousData, // Keep previous data
  });
}

// Or with static placeholder
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    placeholderData: {
      id,
      name: 'Loading...',
      email: 'loading@example.com',
    },
  });
}
```

---

## Button Loading States

### Loading Button

```tsx
// components/ui/loading-button.tsx
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  children,
  isLoading,
  loadingText,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText || children : children}
    </Button>
  );
}

// Usage
<LoadingButton
  isLoading={isPending}
  loadingText="Saving..."
  onClick={handleSave}
>
  Save Changes
</LoadingButton>
```

### Submit Button with Form State

```tsx
// components/forms/submit-button.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends ButtonProps {
  loadingText?: string;
}

export function SubmitButton({
  children,
  loadingText = 'Submitting...',
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? loadingText : children}
    </Button>
  );
}
```

---

## Progress Indicators

### Progress Bar

```tsx
// components/ui/progress.tsx
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  indeterminate?: boolean;
}

export function Progress({
  className,
  value,
  indeterminate,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full bg-primary transition-all',
          indeterminate && 'animate-progress-indeterminate w-1/3'
        )}
        style={!indeterminate ? { width: `${value}%` } : undefined}
      />
    </ProgressPrimitive.Root>
  );
}
```

### Step Progress

```tsx
// components/shared/step-progress.tsx
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  title: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2',
                isCompleted && 'border-primary bg-primary text-primary-foreground',
                isCurrent && 'border-primary',
                !isCompleted && !isCurrent && 'border-muted'
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-24 mx-2',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Loading Patterns

### Optimistic UI Pattern

```tsx
// Don't show loading if we have cached data
function DataDisplay() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    staleTime: 60 * 1000,
  });

  // Only show skeleton on initial load
  if (isLoading) {
    return <DataSkeleton />;
  }

  // Show data with subtle refresh indicator
  return (
    <div>
      {isFetching && <RefreshIndicator />}
      <DataView data={data} />
    </div>
  );
}
```

### Progressive Loading

```tsx
// Load critical content first, then secondary
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Critical - loads first */}
      <Suspense fallback={<ProductHeaderSkeleton />}>
        <ProductHeader id={params.id} />
      </Suspense>

      {/* Secondary - can wait */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews id={params.id} />
      </Suspense>

      {/* Tertiary - lowest priority */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <RelatedProducts id={params.id} />
      </Suspense>
    </div>
  );
}
```

---

## Best Practices

### 1. Match Skeleton to Content

```tsx
// Good - skeleton matches actual content layout
<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>

// Avoid - generic skeleton that doesn't match
<Skeleton className="h-20 w-full" />
```

### 2. Avoid Loading Flash

```tsx
// Delay showing loading state to avoid flash
function DataDisplay() {
  const { data, isLoading } = useQuery({...});
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setShowSkeleton(true);
    }, 200); // 200ms delay

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && showSkeleton) {
    return <Skeleton />;
  }

  return <DataView data={data} />;
}
```

### 3. Preserve Layout Stability

```tsx
// Reserve space to prevent layout shift
<div className="min-h-[400px]">
  {isLoading ? <Skeleton className="h-full" /> : <Content />}
</div>
```

### 4. Accessible Loading States

```tsx
// Announce loading to screen readers
<div role="status" aria-busy={isLoading} aria-live="polite">
  {isLoading ? (
    <>
      <Skeleton />
      <span className="sr-only">Loading content...</span>
    </>
  ) : (
    <Content />
  )}
</div>
```

---

## External Resources

- [Next.js Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Skeleton UI Best Practices](https://www.nngroup.com/articles/skeleton-screens/)
