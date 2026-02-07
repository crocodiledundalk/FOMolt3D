# Authentication

Patterns for implementing authentication, authorization, and role-based access control in Next.js applications.

## Use When

- Implementing user authentication flows
- Protecting routes and pages
- Implementing role-based access control (RBAC)
- Managing user sessions
- Handling auth state across the application

---

## Auth Provider Setup

### Auth Context

```tsx
// providers/auth-provider.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthState } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const userData = await response.json();
    setUser(userData);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  const refresh = useCallback(async () => {
    await checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Root Layout Integration

```tsx
// app/layout.tsx
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Route Protection

### Protected Route Wrapper

```tsx
// components/auth/protected-route.tsx
'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  fallback = <LoadingScreen />,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?callbackUrl=${window.location.pathname}`);
    }
  }, [isLoading, isAuthenticated, router]);

  // Check role-based access
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      requiredRoles &&
      user &&
      !requiredRoles.includes(user.role)
    ) {
      router.push('/unauthorized');
    }
  }, [isLoading, isAuthenticated, requiredRoles, user, router]);

  if (isLoading) {
    return fallback;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
}
```

### Protected Layout

```tsx
// app/(protected)/layout.tsx
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
```

### Middleware Protection

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/settings', '/profile'];

// Routes that require specific roles
const roleProtectedRoutes = {
  '/admin': ['admin'],
  '/manager': ['admin', 'manager'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    // Check for auth token
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For role-based routes, check role in token
    // This is a simplified example - in production, verify JWT
    for (const [route, roles] of Object.entries(roleProtectedRoutes)) {
      if (pathname.startsWith(route)) {
        // Decode and verify token, check role
        // Redirect to /unauthorized if role doesn't match
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

---

## Role-Based Access Control (RBAC)

### Role Types and Permissions

```tsx
// lib/auth/permissions.ts
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Users
  'users:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'users:create': [ROLES.ADMIN, ROLES.MANAGER],
  'users:update': [ROLES.ADMIN, ROLES.MANAGER],
  'users:delete': [ROLES.ADMIN],

  // Projects
  'projects:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER, ROLES.VIEWER],
  'projects:create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'projects:update': [ROLES.ADMIN, ROLES.MANAGER],
  'projects:delete': [ROLES.ADMIN],

  // Settings
  'settings:read': [ROLES.ADMIN, ROLES.MANAGER],
  'settings:update': [ROLES.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
```

### Permission Hook

```tsx
// lib/hooks/use-permissions.ts
'use client';

import { useAuth } from '@/providers/auth-provider';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type Permission,
} from '@/lib/auth/permissions';

export function usePermissions() {
  const { user } = useAuth();

  return {
    can: (permission: Permission) =>
      user ? hasPermission(user.role, permission) : false,

    canAny: (permissions: Permission[]) =>
      user ? hasAnyPermission(user.role, permissions) : false,

    canAll: (permissions: Permission[]) =>
      user ? hasAllPermissions(user.role, permissions) : false,

    role: user?.role,
  };
}
```

### Permission-Based Components

```tsx
// components/auth/can.tsx
'use client';

import { usePermissions } from '@/lib/hooks/use-permissions';
import type { Permission } from '@/lib/auth/permissions';

interface CanProps {
  permission: Permission | Permission[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({
  permission,
  mode = 'all',
  fallback = null,
  children,
}: CanProps) {
  const { can, canAny, canAll } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess =
    mode === 'any' ? canAny(permissions) : canAll(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage
function UserActions({ userId }: { userId: string }) {
  return (
    <div className="flex gap-2">
      <Can permission="users:read">
        <Button variant="outline">View</Button>
      </Can>

      <Can permission="users:update">
        <Button variant="outline">Edit</Button>
      </Can>

      <Can permission="users:delete">
        <Button variant="destructive">Delete</Button>
      </Can>
    </div>
  );
}
```

### Role-Based Navigation

```tsx
// components/layouts/sidebar-nav.tsx
'use client';

import { usePermissions } from '@/lib/hooks/use-permissions';
import type { Permission } from '@/lib/auth/permissions';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType;
  permission?: Permission;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { title: 'Users', href: '/users', icon: UsersIcon, permission: 'users:read' },
  {
    title: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
    permission: 'settings:read',
  },
  { title: 'Admin', href: '/admin', icon: ShieldIcon, permission: 'users:delete' },
];

export function SidebarNav() {
  const { can } = usePermissions();

  const visibleItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => (
        <NavLink key={item.href} href={item.href}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

---

## Auth Forms

### Login Form

```tsx
// components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
```

### Registration Form

```tsx
// components/auth/register-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Registration logic
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields similar to login */}
    </form>
  );
}
```

---

## Session Management

### Session Hook with React Query

```tsx
// lib/hooks/use-session.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { User, LoginCredentials } from '@/types/auth';

export function useSession() {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<User>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      api.post<User>('/auth/login', credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(['session'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(['session'], null);
      queryClient.clear(); // Clear all cached data on logout
    },
  });

  return {
    user: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!sessionQuery.data,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
```

### Token Refresh

```tsx
// lib/api/client.ts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

async function refreshToken(): Promise<string> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  return data.accessToken;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        onTokenRefreshed(newToken);
      } catch (error) {
        // Redirect to login
        window.location.href = '/login';
        throw error;
      } finally {
        isRefreshing = false;
      }
    }

    return new Promise((resolve) => {
      subscribeTokenRefresh(() => {
        resolve(fetch(url, options));
      });
    });
  }

  return response;
}
```

---

## Auth UI Patterns

### User Menu

```tsx
// components/auth/user-menu.tsx
'use client';

import { useAuth } from '@/providers/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Auth Status Indicator

```tsx
// components/auth/auth-status.tsx
'use client';

import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMenu } from './user-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AuthStatus() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  return <UserMenu />;
}
```

---

## Best Practices

### 1. Secure Token Storage

```tsx
// Use httpOnly cookies for tokens (server-side)
// Never store tokens in localStorage for sensitive apps

// API route example
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Authenticate user...
  const token = generateToken(user);

  cookies().set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return Response.json({ user });
}
```

### 2. Protect API Routes

```tsx
// lib/auth/get-session.ts
import { cookies } from 'next/headers';
import { verifyToken } from './jwt';

export async function getSession() {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

// app/api/protected/route.ts
import { getSession } from '@/lib/auth/get-session';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Handle authenticated request
}
```

### 3. Handle Auth Errors Gracefully

```tsx
// Always provide clear error messages
// Handle network errors
// Implement proper loading states
```

### 4. Implement CSRF Protection

```tsx
// Use SameSite cookies
// Implement CSRF tokens for sensitive operations
```

---

## External Resources

- [NextAuth.js](https://next-auth.js.org/) - Popular auth library for Next.js
- [Clerk](https://clerk.dev/) - Drop-in auth solution
- [Auth0](https://auth0.com/) - Enterprise auth platform
- [OWASP Authentication Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/)
