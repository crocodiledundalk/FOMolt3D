# State Management

Patterns for managing application state including React Context, custom hooks, and when to use different state solutions.

## Use When

- Sharing state across multiple components
- Managing global application state
- Organizing complex state logic
- Deciding between local and global state
- Implementing derived/computed state

---

## State Categories

### When to Use Each Type

| State Type | Use Case | Solution |
|------------|----------|----------|
| UI State | Modals, tabs, dropdowns | `useState`, Context |
| Form State | Form inputs, validation | React Hook Form |
| Server State | API data, cache | TanStack Query |
| URL State | Filters, pagination | `useSearchParams` |
| Global State | Theme, auth, preferences | Context, Zustand |

---

## React Context Patterns

### Basic Context with Provider

```tsx
// contexts/sidebar-context.tsx
'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
```

### Context with Reducer

```tsx
// contexts/cart-context.tsx
'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';
import type { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
  total: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );

      if (existingItem) {
        const items = state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return { ...state, items, total: calculateTotal(items) };
      }

      const items = [...state.items, { ...action.payload, quantity: 1 }];
      return { ...state, items, total: calculateTotal(items) };
    }

    case 'REMOVE_ITEM': {
      const items = state.items.filter((item) => item.id !== action.payload);
      return { ...state, items, total: calculateTotal(items) };
    }

    case 'UPDATE_QUANTITY': {
      const items = state.items.map((item) =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return { ...state, items, total: calculateTotal(items) };
    }

    case 'CLEAR_CART':
      return initialState;

    default:
      return state;
  }
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

interface CartContextType extends CartState {
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((product: Product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
```

### Optimized Context (Split Read/Write)

```tsx
// contexts/optimized-context.tsx
'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Separate contexts to prevent unnecessary re-renders
const CountStateContext = createContext<number | undefined>(undefined);
const CountActionsContext = createContext<{
  increment: () => void;
  decrement: () => void;
  reset: () => void;
} | undefined>(undefined);

export function CountProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const actions = useMemo(
    () => ({
      increment: () => setCount((c) => c + 1),
      decrement: () => setCount((c) => c - 1),
      reset: () => setCount(0),
    }),
    []
  );

  return (
    <CountStateContext.Provider value={count}>
      <CountActionsContext.Provider value={actions}>
        {children}
      </CountActionsContext.Provider>
    </CountStateContext.Provider>
  );
}

// Components that only need to read won't re-render when actions change
export function useCountState() {
  const context = useContext(CountStateContext);
  if (context === undefined) {
    throw new Error('useCountState must be used within a CountProvider');
  }
  return context;
}

// Components that only need actions won't re-render when count changes
export function useCountActions() {
  const context = useContext(CountActionsContext);
  if (context === undefined) {
    throw new Error('useCountActions must be used within a CountProvider');
  }
  return context;
}
```

---

## Custom Hooks

### State Hook with Local Storage

```tsx
// lib/hooks/use-local-storage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with localStorage value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
```

### Toggle Hook

```tsx
// lib/hooks/use-toggle.ts
'use client';

import { useState, useCallback } from 'react';

export function useToggle(
  initialValue = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((newValue: boolean) => setValue(newValue), []);

  return [value, toggle, set];
}

// Usage
function Component() {
  const [isOpen, toggle, setOpen] = useToggle(false);

  return (
    <>
      <Button onClick={toggle}>Toggle</Button>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </>
  );
}
```

### Previous Value Hook

```tsx
// lib/hooks/use-previous.ts
'use client';

import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Usage
function Component({ count }: { count: number }) {
  const prevCount = usePrevious(count);

  return (
    <div>
      Now: {count}, Previously: {prevCount ?? 'N/A'}
    </div>
  );
}
```

### Debounced State

```tsx
// lib/hooks/use-debounced-state.ts
'use client';

import { useState, useEffect } from 'react';

export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue, value, setValue];
}

// Usage - Search input
function SearchInput() {
  const [debouncedQuery, query, setQuery] = useDebouncedState('', 300);

  // Use debouncedQuery for API calls
  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

## URL State Management

### Search Params Hook

```tsx
// lib/hooks/use-query-params.ts
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useQueryParams<T extends Record<string, string>>() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const params = Object.fromEntries(searchParams.entries()) as Partial<T>;

  const setParams = useCallback(
    (newParams: Partial<T>, options?: { replace?: boolean }) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      const query = current.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (options?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [searchParams, pathname, router]
  );

  const clearParams = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return { params, setParams, clearParams };
}

// Usage
interface Filters {
  search: string;
  status: string;
  page: string;
}

function FilteredList() {
  const { params, setParams } = useQueryParams<Filters>();

  return (
    <>
      <Input
        value={params.search || ''}
        onChange={(e) => setParams({ search: e.target.value, page: '1' })}
      />
      <Select
        value={params.status || 'all'}
        onValueChange={(value) => setParams({ status: value, page: '1' })}
      >
        {/* options */}
      </Select>
    </>
  );
}
```

### Pagination with URL State

```tsx
// lib/hooks/use-pagination.ts
'use client';

import { useQueryParams } from './use-query-params';

interface PaginationParams {
  page: string;
  pageSize: string;
}

export function usePagination(defaultPageSize = 10) {
  const { params, setParams } = useQueryParams<PaginationParams>();

  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || String(defaultPageSize), 10);

  const setPage = (newPage: number) => {
    setParams({ page: String(newPage) }, { replace: true });
  };

  const setPageSize = (newPageSize: number) => {
    setParams({ pageSize: String(newPageSize), page: '1' }, { replace: true });
  };

  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(Math.max(1, page - 1));

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    offset: (page - 1) * pageSize,
  };
}
```

---

## Zustand (Lightweight Global State)

### Basic Store

```tsx
// lib/stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  modalOpen: string | null;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  modalOpen: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (id) => set({ modalOpen: id }),
  closeModal: () => set({ modalOpen: null }),
}));

// Usage
function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside className={sidebarOpen ? 'w-64' : 'w-16'}>
      <Button onClick={toggleSidebar}>Toggle</Button>
    </aside>
  );
}
```

### Store with Persistence

```tsx
// lib/stores/preferences-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  compactMode: boolean;
  notifications: boolean;
  language: string;
  setCompactMode: (value: boolean) => void;
  setNotifications: (value: boolean) => void;
  setLanguage: (value: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      compactMode: false,
      notifications: true,
      language: 'en',
      setCompactMode: (compactMode) => set({ compactMode }),
      setNotifications: (notifications) => set({ notifications }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'preferences-storage',
    }
  )
);
```

### Store with Selectors

```tsx
// lib/stores/user-store.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Selectors for optimized re-renders
export const useUser = () => useUserStore((state) => state.user);
export const useUserRole = () => useUserStore((state) => state.user?.role);
export const useIsAuthenticated = () =>
  useUserStore((state) => state.user !== null);
```

---

## Derived State

### Computed Values with useMemo

```tsx
'use client';

import { useMemo } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface ProductListProps {
  products: Product[];
  filter: string;
  sortBy: 'name' | 'price';
  sortOrder: 'asc' | 'desc';
}

export function ProductList({
  products,
  filter,
  sortBy,
  sortOrder,
}: ProductListProps) {
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // Filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerFilter) ||
          p.category.toLowerCase().includes(lowerFilter)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return result;
  }, [products, filter, sortBy, sortOrder]);

  return (
    <div>
      {filteredAndSortedProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Derived State in Context

```tsx
// contexts/filters-context.tsx
'use client';

import { createContext, useContext, useState, useMemo } from 'react';

interface FiltersState {
  search: string;
  category: string | null;
  priceRange: [number, number];
  inStock: boolean;
}

interface FiltersContextType extends FiltersState {
  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setPriceRange: (range: [number, number]) => void;
  setInStock: (inStock: boolean) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

const initialState: FiltersState = {
  search: '',
  category: null,
  priceRange: [0, 1000],
  inStock: false,
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>(initialState);

  // Derived state
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
    if (filters.inStock) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const setSearch = (search: string) =>
    setFilters((prev) => ({ ...prev, search }));

  const setCategory = (category: string | null) =>
    setFilters((prev) => ({ ...prev, category }));

  const setPriceRange = (priceRange: [number, number]) =>
    setFilters((prev) => ({ ...prev, priceRange }));

  const setInStock = (inStock: boolean) =>
    setFilters((prev) => ({ ...prev, inStock }));

  const clearFilters = () => setFilters(initialState);

  return (
    <FiltersContext.Provider
      value={{
        ...filters,
        setSearch,
        setCategory,
        setPriceRange,
        setInStock,
        clearFilters,
        activeFilterCount,
        hasActiveFilters,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
```

---

## Best Practices

### 1. Keep State Close to Where It's Used

```tsx
// Good - local state for local concerns
function SearchInput() {
  const [query, setQuery] = useState('');
  // ...
}

// Avoid - global state for local concerns
const useSearchStore = create((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));
```

### 2. Lift State Only When Necessary

```tsx
// Start with local state
function Parent() {
  return (
    <>
      <ChildA />
      <ChildB />
    </>
  );
}

// Lift when siblings need to share
function Parent() {
  const [shared, setShared] = useState();
  return (
    <>
      <ChildA shared={shared} />
      <ChildB onUpdate={setShared} />
    </>
  );
}
```

### 3. Use Server State for Server Data

```tsx
// Good - use React Query for API data
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});

// Avoid - storing API data in useState/Context
const [users, setUsers] = useState([]);
useEffect(() => {
  fetchUsers().then(setUsers);
}, []);
```

### 4. Avoid Prop Drilling

```tsx
// If passing props through 3+ levels, consider:
// 1. Context for truly global state
// 2. Composition patterns
// 3. Component restructuring
```

---

## External Resources

- [React Context](https://react.dev/learn/passing-data-deeply-with-context)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
- [State Management Comparison](https://docs.pmnd.rs/zustand/getting-started/comparison)
