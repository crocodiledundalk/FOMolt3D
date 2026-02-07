# Data Fetching

Patterns for fetching, caching, and managing server state using TanStack Query (React Query) in Next.js applications.

## Use When

- Fetching data from APIs
- Implementing caching strategies
- Managing loading and error states
- Handling mutations with optimistic updates
- Implementing pagination and infinite scroll

---

## Setup

### Install Dependencies

```bash
npm install @tanstack/react-query
```

### Query Provider

```tsx
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Root Layout Integration

```tsx
// app/layout.tsx
import { QueryProvider } from '@/providers/query-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

---

## Query Key Factory

### Organized Query Keys

```tsx
// lib/api/query-keys.ts
export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: ProjectFilters) =>
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
} as const;
```

---

## API Client

### Fetch Wrapper

```tsx
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.message || 'An error occurred',
      error
    );
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};
```

---

## Query Hooks

### Basic Query Hook

```tsx
// lib/hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { User, CreateUserInput, UpdateUserInput } from '@/types';

// Fetch all users
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters || {}),
    queryFn: () =>
      api.get<User[]>('/users', {
        params: filters as Record<string, string>,
      }),
  });
}

// Fetch single user
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      api.patch<User>(`/users/${id}`, data),
    onSuccess: (data, { id }) => {
      // Update cache for single user
      queryClient.setQueryData(queryKeys.users.detail(id), data);
      // Invalidate list
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: queryKeys.users.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
}
```

### Query with Dependent Data

```tsx
// Fetch user, then fetch their projects
export function useUserWithProjects(userId: string) {
  const userQuery = useUser(userId);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ userId }),
    queryFn: () =>
      api.get<Project[]>('/projects', {
        params: { userId },
      }),
    enabled: !!userQuery.data, // Only fetch when user is loaded
  });

  return {
    user: userQuery.data,
    projects: projectsQuery.data,
    isLoading: userQuery.isLoading || projectsQuery.isLoading,
    error: userQuery.error || projectsQuery.error,
  };
}
```

---

## Optimistic Updates

### Optimistic Mutation

```tsx
// lib/hooks/use-todo.ts
export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch<Todo>(`/todos/${id}`, { completed }),

    // Optimistic update
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      );

      // Return context for rollback
      return { previousTodos };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    // Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

---

## Pagination

### Offset Pagination

```tsx
// lib/hooks/use-paginated-users.ts
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function usePaginatedUsers(page: number, pageSize: number = 10) {
  return useQuery({
    queryKey: ['users', 'paginated', { page, pageSize }],
    queryFn: () =>
      api.get<PaginatedResponse<User>>('/users', {
        params: {
          page: String(page),
          pageSize: String(pageSize),
        },
      }),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}
```

### Infinite Scroll

```tsx
// lib/hooks/use-infinite-users.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteUsers() {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      api.get<PaginatedResponse<User>>('/users', {
        params: {
          page: String(pageParam),
          pageSize: '20',
        },
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

// Usage in component
function UserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteUsers();

  // Flatten all pages
  const users = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

---

## Server State vs Client State

### When to Use React Query

- Data from external sources (APIs)
- Data shared across components
- Data that needs caching/refetching
- Data with loading/error states

### When to Use useState/Zustand

- UI state (modals, tabs, etc.)
- Form state
- Local preferences
- Derived/computed state

---

## Prefetching

### Prefetch on Hover

```tsx
// components/features/users/user-link.tsx
'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

interface UserLinkProps {
  userId: string;
  children: React.ReactNode;
}

export function UserLink({ userId, children }: UserLinkProps) {
  const queryClient = useQueryClient();

  const prefetchUser = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: () => api.get(`/users/${userId}`),
      staleTime: 60 * 1000, // 1 minute
    });
  };

  return (
    <Link
      href={`/users/${userId}`}
      onMouseEnter={prefetchUser}
      onFocus={prefetchUser}
    >
      {children}
    </Link>
  );
}
```

### Prefetch in Server Components

```tsx
// app/users/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { UserList } from '@/components/features/users/user-list';

async function getUsers() {
  const response = await fetch(`${process.env.API_URL}/users`);
  return response.json();
}

export default async function UsersPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['users', 'list', {}],
    queryFn: getUsers,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}
```

---

## Error Handling

### Global Error Handling

```tsx
// providers/query-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof ApiError && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        // Global error toast
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'An unexpected error occurred'
        );
      },
    },
  },
});
```

### Per-Query Error Handling

```tsx
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => api.get<User>(`/users/${id}`),
    retry: false,
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        // Handle not found specifically
      }
    },
  });
}
```

---

## Usage Patterns

### In Components

```tsx
// components/features/users/user-list.tsx
'use client';

import { useUsers } from '@/lib/hooks/use-users';
import { UserCard } from './user-card';
import { UserListSkeleton } from './user-list-skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';

export function UserList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) {
    return <UserListSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load users"
        retry={() => window.location.reload()}
      />
    );
  }

  if (!users?.length) {
    return <EmptyState message="No users found" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### With Forms

```tsx
// components/forms/user-form.tsx
'use client';

import { useCreateUser } from '@/lib/hooks/use-users';
import { toast } from 'sonner';

export function CreateUserForm() {
  const createUser = useCreateUser();

  const onSubmit = async (data: CreateUserInput) => {
    try {
      await createUser.mutateAsync(data);
      toast.success('User created successfully');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <Button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
}
```

---

## Best Practices

### 1. Use Query Key Factory

```tsx
// Consistent, type-safe query keys
queryKeys.users.detail(id) // ['users', 'detail', '123']
```

### 2. Invalidate Strategically

```tsx
// Invalidate related queries after mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
}
```

### 3. Configure Stale Time Appropriately

```tsx
// Frequently changing data
staleTime: 0

// Semi-static data
staleTime: 5 * 60 * 1000 // 5 minutes

// Static data
staleTime: Infinity
```

### 4. Handle Loading States Properly

```tsx
// Don't flash loading state for cached data
if (isLoading && !data) {
  return <Skeleton />;
}
```

### 5. Use Suspense When Appropriate

```tsx
const { data } = useSuspenseQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
});
// data is guaranteed to be defined
```

---

## External Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [Query Key Factory](https://tkdodo.eu/blog/effective-react-query-keys)
