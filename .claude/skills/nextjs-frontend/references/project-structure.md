# Project Structure

Opinionated directory organization and file naming conventions for Next.js applications that scale.

## Use When

- Setting up a new Next.js project
- Refactoring existing project structure
- Deciding where to place new files
- Creating new features or components

---

## Directory Structure

### Root Level

```
├── app/                       # Next.js App Router
├── components/                # React components
├── lib/                       # Utilities, hooks, configs
├── providers/                 # Context providers
├── types/                     # TypeScript type definitions
├── public/                    # Static assets
├── styles/                    # Global styles (if needed)
└── tests/                     # Test utilities and setup
```

### App Directory (Routes)

```
app/
├── (auth)/                    # Route group - no URL segment
│   ├── login/
│   │   ├── page.tsx          # /login
│   │   └── loading.tsx       # Loading UI
│   ├── register/
│   │   └── page.tsx          # /register
│   ├── forgot-password/
│   │   └── page.tsx
│   └── layout.tsx            # Shared auth layout
│
├── (dashboard)/               # Route group - authenticated
│   ├── layout.tsx            # Dashboard layout with sidebar
│   ├── page.tsx              # /dashboard (redirect or overview)
│   ├── overview/
│   │   └── page.tsx
│   ├── users/
│   │   ├── page.tsx          # /users - list
│   │   ├── [id]/
│   │   │   ├── page.tsx      # /users/123 - detail
│   │   │   └── edit/
│   │   │       └── page.tsx  # /users/123/edit
│   │   └── new/
│   │       └── page.tsx      # /users/new
│   └── settings/
│       ├── page.tsx
│       └── [...slug]/        # Catch-all for settings sections
│           └── page.tsx
│
├── (marketing)/               # Public pages
│   ├── layout.tsx
│   ├── page.tsx              # Home
│   ├── about/
│   │   └── page.tsx
│   └── pricing/
│       └── page.tsx
│
├── api/                       # API routes
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts
│   ├── users/
│   │   ├── route.ts          # GET /api/users, POST /api/users
│   │   └── [id]/
│   │       └── route.ts      # GET/PUT/DELETE /api/users/123
│   └── webhooks/
│       └── stripe/
│           └── route.ts
│
├── layout.tsx                 # Root layout
├── loading.tsx                # Root loading
├── error.tsx                  # Root error boundary
├── not-found.tsx              # 404 page
└── globals.css                # Global styles
```

### Components Directory

```
components/
├── ui/                        # Primitive UI components (shadcn)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── table.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── skeleton.tsx
│   └── index.ts              # Barrel export
│
├── forms/                     # Form components
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── user-form.tsx
│   ├── settings-form.tsx
│   └── index.ts
│
├── layouts/                   # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── footer.tsx
│   ├── mobile-nav.tsx
│   ├── breadcrumbs.tsx
│   └── index.ts
│
├── features/                  # Feature-specific components
│   ├── users/
│   │   ├── user-card.tsx
│   │   ├── user-list.tsx
│   │   ├── user-list-skeleton.tsx
│   │   ├── user-actions.tsx
│   │   ├── user-avatar.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── stats-card.tsx
│   │   ├── activity-feed.tsx
│   │   ├── recent-users.tsx
│   │   └── index.ts
│   └── settings/
│       ├── profile-section.tsx
│       ├── security-section.tsx
│       └── index.ts
│
└── shared/                    # Shared/generic components
    ├── page-header.tsx
    ├── section-header.tsx
    ├── empty-state.tsx
    ├── error-state.tsx
    ├── loading-spinner.tsx
    ├── confirm-dialog.tsx
    ├── data-table/
    │   ├── data-table.tsx
    │   ├── data-table-pagination.tsx
    │   ├── data-table-toolbar.tsx
    │   ├── data-table-column-header.tsx
    │   └── index.ts
    └── index.ts
```

### Lib Directory

```
lib/
├── api/                       # API client layer
│   ├── client.ts             # Fetch wrapper with auth
│   ├── endpoints.ts          # API endpoint definitions
│   ├── users.ts              # User API functions
│   ├── auth.ts               # Auth API functions
│   └── index.ts
│
├── hooks/                     # Custom React hooks
│   ├── use-auth.ts
│   ├── use-user.ts
│   ├── use-users.ts
│   ├── use-media-query.ts
│   ├── use-local-storage.ts
│   ├── use-debounce.ts
│   ├── use-copy-to-clipboard.ts
│   └── index.ts
│
├── utils/                     # Utility functions
│   ├── cn.ts                 # Class name merger
│   ├── format.ts             # Formatters (date, currency, etc.)
│   ├── validation.ts         # Validation helpers
│   └── index.ts
│
├── validations/               # Zod schemas
│   ├── auth.ts
│   ├── user.ts
│   ├── settings.ts
│   └── index.ts
│
├── config/                    # Configuration
│   ├── site.ts               # Site metadata
│   ├── navigation.ts         # Nav items config
│   ├── dashboard.ts          # Dashboard config
│   └── index.ts
│
└── constants/                 # Constants
    ├── routes.ts             # Route constants
    ├── api.ts                # API constants
    └── index.ts
```

### Providers Directory

```
providers/
├── index.tsx                  # Combined providers wrapper
├── query-provider.tsx         # React Query provider
├── theme-provider.tsx         # Theme (light/dark) provider
├── auth-provider.tsx          # Authentication provider
└── toast-provider.tsx         # Toast/notification provider
```

### Types Directory

```
types/
├── index.ts                   # Re-exports
├── api.ts                     # API response types
├── auth.ts                    # Auth-related types
├── user.ts                    # User types
├── navigation.ts              # Navigation types
└── common.ts                  # Common/shared types
```

---

## File Naming Conventions

### General Rules

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `user-card.tsx` |
| Pages | `page.tsx` in folder | `users/page.tsx` |
| Layouts | `layout.tsx` | `(dashboard)/layout.tsx` |
| Loading | `loading.tsx` | `users/loading.tsx` |
| Error | `error.tsx` | `users/error.tsx` |
| Hooks | `use-*.ts` | `use-users.ts` |
| Utils | kebab-case | `format-date.ts` |
| Types | kebab-case | `user.ts` |
| Config | kebab-case | `site-config.ts` |
| Schemas | `*.schema.ts` or in `validations/` | `user.schema.ts` |
| API routes | `route.ts` | `api/users/route.ts` |

### Component Files

```tsx
// Single component per file
// File: components/features/users/user-card.tsx

export function UserCard() { ... }

// Multiple related components
// File: components/features/users/user-list.tsx

export function UserList() { ... }
export function UserListItem() { ... }  // Only if tightly coupled
```

### Index Files (Barrel Exports)

```tsx
// components/features/users/index.ts
export { UserCard } from './user-card';
export { UserList } from './user-list';
export { UserActions } from './user-actions';

// Usage
import { UserCard, UserList } from '@/components/features/users';
```

---

## Route Groups

### Purpose

Route groups `(folder)` organize routes without affecting the URL structure.

### Common Patterns

```
app/
├── (auth)/           # Unauthenticated routes with minimal layout
├── (dashboard)/      # Authenticated routes with full layout
├── (marketing)/      # Public marketing pages
└── (admin)/          # Admin-only routes
```

### Layout Inheritance

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## Feature-Based Organization

### When Features Grow

For complex features, use a nested structure:

```
components/features/users/
├── components/               # Feature-specific components
│   ├── user-card.tsx
│   ├── user-list.tsx
│   └── user-filters.tsx
├── hooks/                    # Feature-specific hooks
│   ├── use-user.ts
│   └── use-user-filters.ts
├── utils/                    # Feature-specific utils
│   └── format-user.ts
├── types.ts                  # Feature types
└── index.ts                  # Public exports
```

### Import Rules

```tsx
// External imports - use from feature index
import { UserCard, useUser } from '@/components/features/users';

// Internal imports - use relative
// Inside user-list.tsx
import { UserCard } from './components/user-card';
import { useUserFilters } from './hooks/use-user-filters';
```

---

## Colocation Patterns

### Component + Styles

```
components/features/dashboard/
├── stats-card.tsx
└── stats-card.module.css    # If CSS modules needed
```

### Component + Tests

```
components/features/users/
├── user-card.tsx
├── user-card.test.tsx       # Unit test
└── user-card.stories.tsx    # Storybook (optional)
```

### Page + Components

For page-specific components that won't be reused:

```
app/(dashboard)/users/
├── page.tsx
├── _components/             # Page-specific components
│   ├── user-filters.tsx
│   └── user-table.tsx
└── loading.tsx
```

---

## Import Aliases

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Usage

```tsx
// Always use aliases for non-relative imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

// Use relative only for same-directory imports
import { UserActions } from './user-actions';
```

---

## Best Practices

### 1. Keep App Directory Clean

Only routing-related files in `app/`:
- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `route.ts` (API)

### 2. Colocate Related Code

Keep related code together:
- Tests next to components
- Types with their features
- Hooks with their data

### 3. Use Barrel Exports Wisely

Create `index.ts` for:
- UI components
- Feature components
- Hooks
- Utils

Avoid for:
- Pages (causes bundling issues)
- Large utility libraries

### 4. Separate Concerns

```
lib/
├── api/        # Data fetching
├── hooks/      # State and effects
├── utils/      # Pure functions
├── config/     # Configuration
└── validations/ # Schemas
```

### 5. Progressive Disclosure

Start simple, add structure as needed:

```
# Start
components/user-card.tsx

# As it grows
components/features/users/user-card.tsx

# When complex
components/features/users/components/user-card.tsx
```

---

## External Resources

- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [App Router](https://nextjs.org/docs/app)
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Colocation](https://nextjs.org/docs/app/building-your-application/routing/colocation)
