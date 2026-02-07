# Persistence

Patterns for persisting data in the browser including localStorage, sessionStorage, cookies, and IndexedDB.

## Use When

- Storing user preferences (theme, language, layout)
- Caching data for offline use
- Persisting form data across sessions
- Storing authentication tokens
- Implementing "remember me" functionality

---

## localStorage Hooks

### Basic useLocalStorage Hook

```tsx
// lib/hooks/use-local-storage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
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

          // Dispatch custom event for cross-tab sync
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              newValue: JSON.stringify(valueToStore),
            })
          );
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
```

### Typed Storage Keys

```tsx
// lib/storage/keys.ts
export const STORAGE_KEYS = {
  THEME: 'app-theme',
  LANGUAGE: 'app-language',
  SIDEBAR_STATE: 'sidebar-collapsed',
  TABLE_PAGE_SIZE: 'table-page-size',
  RECENT_SEARCHES: 'recent-searches',
  USER_PREFERENCES: 'user-preferences',
  DRAFT_FORM: 'draft-form',
  ONBOARDING_COMPLETED: 'onboarding-completed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

### Specialized Preference Hooks

```tsx
// lib/hooks/use-preferences.ts
'use client';

import { useLocalStorage } from './use-local-storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';

interface UserPreferences {
  compactMode: boolean;
  showNotifications: boolean;
  defaultPageSize: number;
  dateFormat: 'short' | 'long' | 'relative';
  timezone: string;
}

const defaultPreferences: UserPreferences = {
  compactMode: false,
  showNotifications: true,
  defaultPageSize: 20,
  dateFormat: 'short',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function usePreferences() {
  const [preferences, setPreferences, resetPreferences] =
    useLocalStorage<UserPreferences>(
      STORAGE_KEYS.USER_PREFERENCES,
      defaultPreferences
    );

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return {
    preferences,
    setPreferences,
    updatePreference,
    resetPreferences,
  };
}
```

---

## sessionStorage

### useSessionStorage Hook

```tsx
// lib/hooks/use-session-storage.ts
'use client';

import { useState, useCallback } from 'react';

export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
```

### Session-Scoped State

```tsx
// Use for temporary state that should persist during session
// but not across browser sessions

// Form wizard progress
const [wizardStep, setWizardStep] = useSessionStorage('wizard-step', 0);

// Temporary filters
const [activeFilters, setActiveFilters] = useSessionStorage('active-filters', {});

// Scroll position
const [scrollPosition, setScrollPosition] = useSessionStorage('scroll-pos', 0);
```

---

## Cookies

### Cookie Utilities

```tsx
// lib/utils/cookies.ts
interface CookieOptions {
  expires?: Date | number; // Date or days
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof document === 'undefined') return;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.expires) {
    const expiresDate =
      options.expires instanceof Date
        ? options.expires
        : new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${expiresDate.toUTCString()}`;
  }

  if (options.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += '; path=/';
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += '; secure';
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }

  document.cookie = cookieString;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const cookie = cookies.find((c) => c.startsWith(`${encodeURIComponent(name)}=`));

  if (cookie) {
    return decodeURIComponent(cookie.split('=')[1]);
  }

  return null;
}

export function deleteCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
  setCookie(name, '', { ...options, expires: new Date(0) });
}
```

### Cookie Hook

```tsx
// lib/hooks/use-cookie.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { getCookie, setCookie, deleteCookie, type CookieOptions } from '@/lib/utils/cookies';

export function useCookie(
  name: string,
  defaultValue: string = ''
): [string, (value: string, options?: CookieOptions) => void, () => void] {
  const [value, setValue] = useState<string>(() => {
    if (typeof document === 'undefined') return defaultValue;
    return getCookie(name) ?? defaultValue;
  });

  const updateCookie = useCallback(
    (newValue: string, options?: CookieOptions) => {
      setCookie(name, newValue, options);
      setValue(newValue);
    },
    [name]
  );

  const removeCookie = useCallback(() => {
    deleteCookie(name);
    setValue(defaultValue);
  }, [name, defaultValue]);

  return [value, updateCookie, removeCookie];
}
```

### Server-Side Cookies (Next.js)

```tsx
// lib/utils/server-cookies.ts
import { cookies } from 'next/headers';

export function getServerCookie(name: string): string | undefined {
  return cookies().get(name)?.value;
}

export function setServerCookie(
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
): void {
  cookies().set(name, value, {
    path: '/',
    ...options,
  });
}

export function deleteServerCookie(name: string): void {
  cookies().delete(name);
}
```

---

## Form Draft Persistence

### Auto-Save Form Hook

```tsx
// lib/hooks/use-form-persistence.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './use-local-storage';
import debounce from 'lodash/debounce';

interface UseFormPersistenceOptions<T> {
  key: string;
  debounceMs?: number;
  exclude?: (keyof T)[];
}

export function useFormPersistence<T extends Record<string, unknown>>(
  values: T,
  options: UseFormPersistenceOptions<T>
): {
  savedValues: Partial<T> | null;
  clearSaved: () => void;
  hasSavedData: boolean;
} {
  const { key, debounceMs = 1000, exclude = [] } = options;
  const [savedValues, setSavedValues, clearSaved] = useLocalStorage<Partial<T> | null>(
    key,
    null
  );

  // Debounced save function
  const debouncedSave = useRef(
    debounce((data: Partial<T>) => {
      setSavedValues(data);
    }, debounceMs)
  ).current;

  // Save form values on change
  useEffect(() => {
    const filteredValues = Object.fromEntries(
      Object.entries(values).filter(
        ([key]) => !exclude.includes(key as keyof T)
      )
    ) as Partial<T>;

    debouncedSave(filteredValues);
  }, [values, debouncedSave, exclude]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    savedValues,
    clearSaved,
    hasSavedData: savedValues !== null,
  };
}

// Usage
function CreatePostForm() {
  const form = useForm<PostFormData>();
  const values = form.watch();

  const { savedValues, clearSaved, hasSavedData } = useFormPersistence(values, {
    key: 'draft-post',
    exclude: ['password'], // Don't persist sensitive fields
  });

  // Restore draft on mount
  useEffect(() => {
    if (savedValues) {
      Object.entries(savedValues).forEach(([key, value]) => {
        form.setValue(key as keyof PostFormData, value);
      });
    }
  }, []);

  const onSubmit = async (data: PostFormData) => {
    await createPost(data);
    clearSaved(); // Clear draft after successful submit
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {hasSavedData && (
        <Alert>
          <p>You have unsaved changes from a previous session.</p>
          <Button variant="outline" size="sm" onClick={clearSaved}>
            Discard Draft
          </Button>
        </Alert>
      )}
      {/* Form fields */}
    </form>
  );
}
```

---

## Recent Items

### Recent Searches Hook

```tsx
// lib/hooks/use-recent-searches.ts
'use client';

import { useLocalStorage } from './use-local-storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';

const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches() {
  const [searches, setSearches] = useLocalStorage<string[]>(
    STORAGE_KEYS.RECENT_SEARCHES,
    []
  );

  const addSearch = (query: string) => {
    if (!query.trim()) return;

    setSearches((prev) => {
      // Remove duplicates and add to front
      const filtered = prev.filter((s) => s !== query);
      return [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const removeSearch = (query: string) => {
    setSearches((prev) => prev.filter((s) => s !== query));
  };

  const clearSearches = () => {
    setSearches([]);
  };

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
```

### Recent Items Component

```tsx
// components/shared/recent-searches.tsx
'use client';

import { useRecentSearches } from '@/lib/hooks/use-recent-searches';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentSearchesProps {
  onSelect: (query: string) => void;
}

export function RecentSearches({ onSelect }: RecentSearchesProps) {
  const { searches, removeSearch, clearSearches } = useRecentSearches();

  if (searches.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Recent searches</span>
        <Button variant="ghost" size="sm" onClick={clearSearches}>
          Clear all
        </Button>
      </div>

      <ul className="space-y-1">
        {searches.map((search) => (
          <li
            key={search}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
          >
            <button
              onClick={() => onSelect(search)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{search}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeSearch(search)}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Zustand Persistence

### Persisted Zustand Store

```tsx
// lib/stores/settings-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  pageSize: number;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setPageSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      pageSize: 20,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        pageSize: state.pageSize,
      }),
    }
  )
);
```

### Session Storage with Zustand

```tsx
// lib/stores/session-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  activeFilters: Record<string, string>;
  expandedSections: string[];
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  toggleSection: (id: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeFilters: {},
      expandedSections: [],
      setFilter: (key, value) =>
        set((state) => ({
          activeFilters: { ...state.activeFilters, [key]: value },
        })),
      clearFilters: () => set({ activeFilters: {} }),
      toggleSection: (id) =>
        set((state) => ({
          expandedSections: state.expandedSections.includes(id)
            ? state.expandedSections.filter((s) => s !== id)
            : [...state.expandedSections, id],
        })),
    }),
    {
      name: 'app-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
```

---

## Storage Utilities

### Storage Manager

```tsx
// lib/storage/manager.ts
class StorageManager {
  private prefix: string;

  constructor(prefix = 'app') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    if (typeof window === 'undefined') return;

    // Only clear keys with our prefix
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => localStorage.removeItem(key));
  }

  // Get storage size
  getSize(): number {
    if (typeof window === 'undefined') return 0;

    let size = 0;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => {
        size += localStorage.getItem(key)?.length ?? 0;
      });

    return size;
  }
}

export const storage = new StorageManager('myapp');
```

---

## Best Practices

### 1. Handle SSR Gracefully

```tsx
// Always check for window
if (typeof window !== 'undefined') {
  localStorage.setItem(key, value);
}

// Or use useEffect for client-only code
useEffect(() => {
  const saved = localStorage.getItem(key);
  if (saved) setValue(JSON.parse(saved));
}, []);
```

### 2. Use Appropriate Storage

```tsx
// localStorage - persistent, survives browser close
// sessionStorage - cleared on tab close
// cookies - sent to server, can be httpOnly
// IndexedDB - large data, complex queries
```

### 3. Handle Storage Errors

```tsx
try {
  localStorage.setItem(key, value);
} catch (error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    // Handle full storage
    console.error('Storage quota exceeded');
  }
}
```

### 4. Don't Store Sensitive Data

```tsx
// Never store in localStorage:
// - Passwords
// - API keys
// - Session tokens (use httpOnly cookies)
// - Personal identifiable information
```

### 5. Use Versioning for Complex Data

```tsx
interface StoredData {
  version: number;
  data: unknown;
}

const CURRENT_VERSION = 2;

function migrateData(stored: StoredData): StoredData {
  if (stored.version < 2) {
    // Migrate from v1 to v2
  }
  return { ...stored, version: CURRENT_VERSION };
}
```

---

## External Resources

- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
