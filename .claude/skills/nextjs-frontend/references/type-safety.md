# Type Safety

Patterns for leveraging TypeScript effectively in Next.js applications.

## Use When

- Defining component props and state
- Working with API responses
- Creating type-safe hooks and utilities
- Ensuring consistency across the codebase
- Preventing runtime errors at compile time

---

## TypeScript Configuration

### Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    },
    // Additional strict options
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Component Types

### Basic Component Props

```tsx
// Explicit interface
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'default', size = 'md', ...props }: ButtonProps) {
  return <button {...props} />;
}
```

### Extending HTML Elements

```tsx
// Extend native button props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  isLoading?: boolean;
}

export function Button({
  variant = 'default',
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button disabled={disabled || isLoading} {...props}>
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

### Component with Ref

```tsx
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && <label>{label}</label>}
        <input ref={ref} className={className} {...props} />
        {error && <span className="text-destructive">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### Polymorphic Components

```tsx
// Component that can render as different elements
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>;

export function Box<E extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Box as="section" className="container">Content</Box>
<Box as="article">Article content</Box>
<Box as={Link} href="/about">Link content</Box>
```

### Children Types

```tsx
// Specific children types
interface CardProps {
  children: React.ReactNode; // Any valid React child
}

interface ListProps {
  children: React.ReactElement[]; // Only React elements
}

interface TextProps {
  children: string; // Only strings
}

interface RenderPropProps {
  children: (data: User) => React.ReactNode; // Render prop
}

// Component with required children structure
interface TabsProps {
  children: React.ReactElement<TabProps>[];
}
```

---

## API and Data Types

### Response Types

```typescript
// types/api.ts

// Base response wrapper
interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Error response
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Entity Types

```typescript
// types/entities/user.ts

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

type UserRole = 'admin' | 'user' | 'guest';

// DTOs (Data Transfer Objects)
type CreateUserDTO = Pick<User, 'email' | 'name'> & {
  password: string;
};

type UpdateUserDTO = Partial<Pick<User, 'name' | 'avatar'>>;

// Response types
type UserResponse = User;
type UsersResponse = PaginatedResponse<User>;
```

### Form Types

```typescript
// types/forms.ts
import { z } from 'zod';

// Schema-derived types
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Manual form types
interface ContactFormData {
  name: string;
  email: string;
  message: string;
  category: 'support' | 'sales' | 'other';
}
```

---

## Utility Types

### Common Utility Types

```typescript
// types/utils.ts

// Make all properties optional recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make specific properties required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific properties optional
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract non-nullable properties
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

// String literal union from array
const statuses = ['pending', 'active', 'completed'] as const;
type Status = (typeof statuses)[number]; // 'pending' | 'active' | 'completed'

// Get keys of a specific type
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Usage: KeysOfType<User, string> -> 'id' | 'email' | 'name'
```

### Discriminated Unions

```typescript
// State machines and status handling
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// Usage
function useAsync<T>(): AsyncState<T> {
  // Implementation
}

// Type narrowing works automatically
const state = useAsync<User>();
if (state.status === 'success') {
  console.log(state.data); // TypeScript knows data exists
}
```

### Type Guards

```typescript
// Custom type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

// Usage
try {
  await fetchUser(id);
} catch (error) {
  if (isApiError(error)) {
    console.log(error.code); // TypeScript knows this is ApiError
  }
}
```

---

## Hook Types

### Custom Hook Types

```typescript
// hooks/use-toggle.ts
function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((v: boolean) => setValue(v), []);
  return [value, toggle, set];
}

// Return object pattern (better for destructuring)
interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

function useToggle(initialValue = false): UseToggleReturn {
  const [value, setValue] = useState(initialValue);
  return {
    value,
    toggle: useCallback(() => setValue((v) => !v), []),
    setTrue: useCallback(() => setValue(true), []),
    setFalse: useCallback(() => setValue(false), []),
  };
}
```

### Generic Hooks

```typescript
// hooks/use-local-storage.ts
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue];
}

// Usage with explicit type
const [user, setUser] = useLocalStorage<User | null>('user', null);
```

---

## Context Types

### Typed Context

```typescript
// contexts/auth-context.tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateUserDTO) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Type-safe hook
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Reducer Context

```typescript
// State type
interface CartState {
  items: CartItem[];
  total: number;
}

// Action types with discriminated union
type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

// Typed reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      // action.payload is Product
      return { ...state };
    case 'REMOVE_ITEM':
      // action.payload is { id: string }
      return { ...state };
    // TypeScript ensures all cases are handled
  }
}
```

---

## Next.js Specific Types

### Page Props

```typescript
// app/users/[id]/page.tsx
interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function UserPage({ params, searchParams }: PageProps) {
  const { id } = params;
  const page = searchParams.page as string | undefined;
  return <div>User {id}</div>;
}
```

### Layout Props

```typescript
// app/layout.tsx
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}

// With params
interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}
```

### Metadata Types

```typescript
import type { Metadata, ResolvingMetadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const product = await getProduct(params.id);
  return {
    title: product.name,
    description: product.description,
  };
}
```

### Server Action Types

```typescript
// app/actions.ts
'use server';

import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type ActionState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validatedFields = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Create user...
  return { success: true, message: 'User created' };
}
```

---

## Zod Integration

### Schema-First Types

```typescript
// schemas/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
});

export const createUserSchema = userSchema.omit({ id: true, createdAt: true });
export const updateUserSchema = createUserSchema.partial();

// Derive types from schemas
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### Runtime Validation

```typescript
// Validate API responses
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return userSchema.parse(data); // Throws if invalid
}

// Safe parsing
async function fetchUserSafe(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  const result = userSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

---

## Type Organization

### File Structure

```
types/
├── index.ts           # Re-exports all types
├── api.ts             # API response types
├── common.ts          # Shared utility types
├── entities/          # Domain entities
│   ├── user.ts
│   ├── product.ts
│   └── order.ts
├── forms/             # Form data types
│   ├── auth.ts
│   └── checkout.ts
└── components/        # Component prop types (if shared)
    └── table.ts
```

### Index Re-exports

```typescript
// types/index.ts
export type { User, CreateUserDTO, UpdateUserDTO } from './entities/user';
export type { Product, ProductVariant } from './entities/product';
export type { ApiResponse, ApiError, PaginatedResponse } from './api';
export type { LoginFormData, SignupFormData } from './forms/auth';
```

---

## Best Practices

### 1. Prefer Interfaces for Objects

```typescript
// Use interface for object types (extendable)
interface User {
  id: string;
  name: string;
}

// Use type for unions, intersections, mapped types
type Status = 'active' | 'inactive';
type UserWithPosts = User & { posts: Post[] };
```

### 2. Avoid `any`

```typescript
// Bad
function processData(data: any) { ... }

// Good - use unknown for unknown types
function processData(data: unknown) {
  if (isUser(data)) {
    // Now TypeScript knows it's User
  }
}
```

### 3. Use Const Assertions

```typescript
// Readonly arrays and literal types
const roles = ['admin', 'user', 'guest'] as const;
type Role = (typeof roles)[number];

// Object with literal types
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} as const;
```

### 4. Generic Constraints

```typescript
// Constrain generics for better type safety
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// With default type
function createStore<T extends object = Record<string, unknown>>(
  initialState: T
) {
  // ...
}
```

---

## External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- [Zod Documentation](https://zod.dev/)
