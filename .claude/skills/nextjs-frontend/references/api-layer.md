# API Layer

Patterns for building a robust API client layer in Next.js applications.

## Use When

- Making HTTP requests to backend APIs
- Handling authentication tokens
- Implementing request/response interceptors
- Managing API errors consistently
- Building type-safe API clients

---

## Base API Client

### Fetch Wrapper

```typescript
// lib/api/client.ts
type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
};

type ApiResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function getAuthToken(): Promise<string | null> {
  // Get token from your auth provider
  // Could be from cookies, localStorage, or auth context
  if (typeof window === 'undefined') {
    // Server-side: get from cookies
    const { cookies } = await import('next/headers');
    return cookies().get('auth-token')?.value || null;
  }
  // Client-side
  return localStorage.getItem('auth-token');
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(endpoint, BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, params, ...fetchConfig } = config;

  const token = await getAuthToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    ...fetchConfig,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return {
    data: data as T,
    status: response.status,
    headers: response.headers,
  };
}
```

### Convenience Methods

```typescript
// lib/api/client.ts (continued)

export const api = {
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...config, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...config, method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...config, method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...config, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...config, method: 'DELETE' });
  },
};
```

---

## Type-Safe API Services

### Service Pattern

```typescript
// lib/api/services/users.ts
import { api } from '../client';
import type { User, CreateUserDTO, UpdateUserDTO, PaginatedResponse } from '@/types';

export const usersService = {
  getAll(params?: { page?: number; limit?: number; search?: string }) {
    return api.get<PaginatedResponse<User>>('/users', { params });
  },

  getById(id: string) {
    return api.get<User>(`/users/${id}`);
  },

  create(data: CreateUserDTO) {
    return api.post<User>('/users', data);
  },

  update(id: string, data: UpdateUserDTO) {
    return api.patch<User>(`/users/${id}`, data);
  },

  delete(id: string) {
    return api.delete<void>(`/users/${id}`);
  },

  // Specific endpoints
  updateAvatar(id: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}/avatar`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData
    });
  },
};
```

### Service Index

```typescript
// lib/api/services/index.ts
export { usersService } from './users';
export { productsService } from './products';
export { ordersService } from './orders';
export { authService } from './auth';
```

---

## Request Interceptors

### With Interceptor Pattern

```typescript
// lib/api/interceptors.ts
type Interceptor = {
  onRequest?: (config: RequestInit) => RequestInit | Promise<RequestInit>;
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
  onError?: (error: ApiError) => void | Promise<void>;
};

const interceptors: Interceptor[] = [];

export function addInterceptor(interceptor: Interceptor) {
  interceptors.push(interceptor);
  return () => {
    const index = interceptors.indexOf(interceptor);
    if (index > -1) interceptors.splice(index, 1);
  };
}

// Apply in client
async function applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
  let result = config;
  for (const interceptor of interceptors) {
    if (interceptor.onRequest) {
      result = await interceptor.onRequest(result);
    }
  }
  return result;
}
```

### Logging Interceptor

```typescript
// lib/api/interceptors/logging.ts
import { addInterceptor } from '../interceptors';

if (process.env.NODE_ENV === 'development') {
  addInterceptor({
    onRequest: (config) => {
      console.log('[API Request]', config);
      return config;
    },
    onResponse: (response) => {
      console.log('[API Response]', response);
      return response;
    },
    onError: (error) => {
      console.error('[API Error]', error);
    },
  });
}
```

### Token Refresh Interceptor

```typescript
// lib/api/interceptors/auth.ts
import { addInterceptor } from '../interceptors';
import { authService } from '../services/auth';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

addInterceptor({
  onError: async (error) => {
    if (error.status === 401) {
      // Token expired, attempt refresh
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = authService.refreshToken();
      }

      try {
        await refreshPromise;
        // Retry original request (handled by React Query)
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  },
});
```

---

## Error Handling

### API Error Types

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidationError() {
    return this.status === 422;
  }

  get isServerError() {
    return this.status >= 500;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}
```

### Error Handler Utility

```typescript
// lib/api/error-handler.ts
import { ApiError, NetworkError } from './errors';
import { toast } from 'sonner';

export function handleApiError(error: unknown): never {
  if (error instanceof ApiError) {
    // Handle specific status codes
    switch (error.status) {
      case 401:
        toast.error('Please log in to continue');
        break;
      case 403:
        toast.error('You do not have permission to perform this action');
        break;
      case 404:
        toast.error('The requested resource was not found');
        break;
      case 422:
        // Validation errors - show first error
        const firstError = Object.values(error.details || {})[0]?.[0];
        toast.error(firstError || 'Validation failed');
        break;
      case 429:
        toast.error('Too many requests. Please try again later');
        break;
      default:
        if (error.isServerError) {
          toast.error('Server error. Please try again later');
        } else {
          toast.error(error.message);
        }
    }
  } else if (error instanceof NetworkError) {
    toast.error('Network error. Please check your connection');
  } else {
    toast.error('An unexpected error occurred');
  }

  throw error;
}
```

---

## Request Utilities

### Request with Timeout

```typescript
// lib/api/utils/timeout.ts
export async function fetchWithTimeout<T>(
  request: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const result = await request;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw error;
  }
}
```

### Request with Retry

```typescript
// lib/api/utils/retry.ts
type RetryConfig = {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  retryOn?: (error: unknown) => boolean;
};

export async function fetchWithRetry<T>(
  request: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    retryOn = (error) => error instanceof NetworkError,
  } = config;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
```

### Request Deduplication

```typescript
// lib/api/utils/dedupe.ts
const pendingRequests = new Map<string, Promise<unknown>>();

export async function dedupeRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = request().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Usage
const user = await dedupeRequest(
  `user-${userId}`,
  () => usersService.getById(userId)
);
```

---

## Server-Side API Calls

### Server Action API Calls

```typescript
// app/actions/users.ts
'use server';

import { api } from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  };

  try {
    const { data: user } = await api.post('/users', data);
    revalidatePath('/users');
    return { success: true, user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create user' };
  }
}
```

### Server Component Data Fetching

```typescript
// app/users/page.tsx
import { api } from '@/lib/api/client';

async function getUsers() {
  const { data } = await api.get<User[]>('/users', {
    next: { revalidate: 60, tags: ['users'] },
  });
  return data;
}

export default async function UsersPage() {
  const users = await getUsers();
  return <UserList users={users} />;
}
```

---

## React Query Integration

### Query Functions

```typescript
// lib/api/queries/users.ts
import { usersService } from '../services/users';
import { queryKeys } from './keys';

export const userQueries = {
  all: () => ({
    queryKey: queryKeys.users.all,
    queryFn: () => usersService.getAll().then((res) => res.data),
  }),

  list: (params: { page?: number; search?: string }) => ({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.getAll(params).then((res) => res.data),
  }),

  detail: (id: string) => ({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersService.getById(id).then((res) => res.data),
  }),
};
```

### Mutation Functions

```typescript
// lib/api/mutations/users.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users';
import { queryKeys } from '../queries/keys';
import { toast } from 'sonner';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('User created successfully');
    },
    onError: (error) => {
      handleApiError(error);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDTO }) =>
      usersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success('User updated successfully');
    },
  });
}
```

---

## File Upload

### Upload with Progress

```typescript
// lib/api/upload.ts
type UploadConfig = {
  onProgress?: (progress: number) => void;
  headers?: Record<string, string>;
};

export async function uploadFile(
  url: string,
  file: File,
  config: UploadConfig = {}
): Promise<Response> {
  const { onProgress, headers = {} } = config;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.response, { status: xhr.status }));
      } else {
        reject(new ApiError('Upload failed', xhr.status));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new NetworkError('Upload failed'));
    });

    xhr.open('POST', url);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    const formData = new FormData();
    formData.append('file', file);

    xhr.send(formData);
  });
}
```

### Upload Hook

```typescript
// hooks/use-upload.ts
'use client';

import { useState } from 'react';
import { uploadFile } from '@/lib/api/upload';

export function useUpload(url: string) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await uploadFile(url, file, {
        onProgress: setProgress,
      });
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, progress, isUploading, error };
}
```

---

## Best Practices

### 1. Centralize API Configuration

```typescript
// All API config in one place
// lib/api/config.ts
export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  retryAttempts: 3,
};
```

### 2. Type Everything

```typescript
// Always define request/response types
type CreateUserRequest = { name: string; email: string };
type CreateUserResponse = User;

api.post<CreateUserResponse>('/users', data as CreateUserRequest);
```

### 3. Handle Errors Consistently

```typescript
// Use error boundaries + toast notifications
// Let React Query handle retries
// Transform API errors to user-friendly messages
```

### 4. Use Query Key Factory

```typescript
// Consistent, type-safe query keys
// Easy to invalidate related queries
// See data-fetching.md for details
```

---

## External Resources

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [TanStack Query](https://tanstack.com/query/latest)
- [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
