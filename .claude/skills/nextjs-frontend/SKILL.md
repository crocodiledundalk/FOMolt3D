# Next.js Frontend Development

Comprehensive patterns and best practices for building production-grade Next.js applications with TypeScript, Tailwind CSS, shadcn/ui, and React Query.

## Metadata

- **Domain**: Frontend Development
- **Stack**: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Complexity**: Intermediate to Advanced

## Use When

- Building new Next.js applications from scratch
- Implementing features in existing Next.js projects
- Creating reusable component libraries
- Setting up design systems and theming
- Implementing authentication and authorization
- Building forms with validation
- Optimizing performance and loading states
- Ensuring accessibility and responsive design
- Setting up testing infrastructure

## Core Principles

### 1. Consistency Over Cleverness

Every component, hook, and pattern should follow established conventions. Multiple developers (or agents) working in parallel should produce code that looks like it was written by one person.

### 2. Component-First Architecture

Build from the bottom up. Create small, focused components that compose into larger features. Never build a one-off component when a reusable abstraction exists.

### 3. Type Safety Everywhere

TypeScript is not optional. Every prop, state, and return value must be typed. Use strict mode and avoid `any`.

### 4. Progressive Enhancement

Start with server components. Add client interactivity only when necessary. Optimize for the fastest initial load.

### 5. Accessible by Default

Every component must be keyboard navigable and screen reader compatible. Use semantic HTML and ARIA attributes appropriately.

---

## Technology Stack

### Core Framework
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0"
}
```

### Styling
```json
{
  "tailwindcss": "^3.4.0",
  "@tailwindcss/typography": "^0.5.0",
  "tailwind-merge": "^2.0.0",
  "clsx": "^2.0.0",
  "class-variance-authority": "^0.7.0"
}
```

### UI Components
```json
{
  "shadcn/ui": "latest",
  "@radix-ui/react-*": "latest",
  "lucide-react": "^0.300.0"
}
```

### Data Fetching & State
```json
{
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.0.0"
}
```

### Forms
```json
{
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.0.0"
}
```

### Utilities
```json
{
  "date-fns": "^3.0.0",
  "sonner": "^1.0.0",
  "nuqs": "^1.0.0"
}
```

---

## Project Structure

```
app/
├── (auth)/                    # Auth route group
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/               # Dashboard route group
│   ├── overview/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── layout.tsx
├── api/                       # API routes
│   └── [...]/route.ts
├── layout.tsx                 # Root layout
├── page.tsx                   # Home page
├── loading.tsx                # Root loading
├── error.tsx                  # Root error
├── not-found.tsx              # 404 page
└── globals.css                # Global styles

components/
├── ui/                        # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── forms/                     # Form components
│   ├── login-form.tsx
│   └── settings-form.tsx
├── layouts/                   # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
├── features/                  # Feature-specific components
│   ├── dashboard/
│   └── settings/
└── shared/                    # Shared components
    ├── data-table.tsx
    ├── page-header.tsx
    └── empty-state.tsx

lib/
├── api/                       # API client
│   ├── client.ts
│   └── endpoints.ts
├── hooks/                     # Custom hooks
│   ├── use-auth.ts
│   └── use-media-query.ts
├── utils/                     # Utility functions
│   ├── cn.ts
│   └── format.ts
├── validations/               # Zod schemas
│   └── auth.ts
└── config/                    # Configuration
    ├── site.ts
    └── navigation.ts

providers/
├── query-provider.tsx         # React Query
├── theme-provider.tsx         # Theme context
└── auth-provider.tsx          # Auth context

types/
├── api.ts                     # API types
├── auth.ts                    # Auth types
└── index.ts                   # Shared types

public/
├── images/
├── icons/
└── fonts/
```

---

## Quick Start Patterns

### Creating a New Page

```tsx
// app/(dashboard)/users/page.tsx
import { Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { UserList } from '@/components/features/users/user-list';
import { UserListSkeleton } from '@/components/features/users/user-list-skeleton';

export const metadata = {
  title: 'Users',
  description: 'Manage your users',
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage your team members and their permissions."
      />
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}
```

### Creating a Client Component

```tsx
// components/features/users/user-actions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDeleteUser } from '@/lib/hooks/use-users';
import { toast } from 'sonner';

interface UserActionsProps {
  userId: string;
}

export function UserActions({ userId }: UserActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser.mutateAsync(userId);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
```

### Creating a Form

```tsx
// components/forms/user-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormValues>;
  onSubmit: (data: UserFormValues) => Promise<void>;
}

export function UserForm({ defaultValues, onSubmit }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Reference Files

This skill includes detailed reference files for specific topics:

### Architecture & Structure
- [Project Structure](./references/project-structure.md) - Directory organization and file naming
- [Component Patterns](./references/component-patterns.md) - Reusable component design
- [Server Components](./references/server-components.md) - RSC vs Client Components

### Styling & Design
- [Design System](./references/design-system.md) - Style guide and visual consistency
- [Theming](./references/theming.md) - Light/dark mode implementation
- [Responsive Design](./references/responsive-design.md) - Breakpoints and mobile patterns
- [Animation](./references/animation.md) - Transitions and motion

### Data & State
- [Data Fetching](./references/data-fetching.md) - React Query patterns
- [State Management](./references/state-management.md) - Contexts, hooks, Zustand
- [API Layer](./references/api-layer.md) - API client patterns
- [Forms](./references/forms.md) - Validation, multi-step forms

### User Experience
- [Loading States](./references/loading-states.md) - Skeletons, spinners, suspense
- [Error Handling](./references/error-handling.md) - Error boundaries and recovery
- [Notifications](./references/notifications.md) - Toasts and alerts
- [Modals & Dialogs](./references/modals-dialogs.md) - Overlay management

### Components
- [Navigation](./references/navigation.md) - Desktop/mobile nav patterns
- [Tables](./references/tables.md) - Data tables with sorting/filtering
- [Image Optimization](./references/image-optimization.md) - Next.js Image patterns

### Infrastructure
- [Authentication](./references/authentication.md) - Auth and RBAC patterns
- [Performance](./references/performance-optimization.md) - Static files and loading
- [Testing](./references/testing.md) - Unit and integration testing
- [Accessibility](./references/accessibility.md) - A11y best practices
- [SEO & Metadata](./references/seo-metadata.md) - Head management

### Configuration
- [Config-Driven](./references/config-driven.md) - Avoiding hardcodes
- [Localization](./references/localization.md) - i18n patterns
- [Persistence](./references/persistence.md) - Local storage and preferences
- [Type Safety](./references/type-safety.md) - TypeScript patterns

### Process
- [Development Workflow](./references/development-workflow.md) - Manager delegation framework

---

## Decision Guide

### When to Use Server Components

Use Server Components (default) when:
- Fetching data
- Accessing backend resources directly
- Keeping sensitive information on server
- Rendering static content
- No user interactivity needed

### When to Use Client Components

Add `'use client'` when:
- Using useState, useEffect, or other hooks
- Using browser APIs
- Adding event listeners
- Using React Context

### When to Create a New Component

Create a new component when:
- Logic is repeated 2+ times
- Component exceeds ~100 lines
- Clear single responsibility exists
- Testability would improve

### When to Use React Query vs Server Fetch

Use React Query when:
- Data needs to be refetched
- Optimistic updates are needed
- Mutations with cache invalidation
- Polling or real-time updates

Use Server Fetch when:
- Static or rarely changing data
- SEO-critical content
- Initial page load data

---

## Code Quality Standards

### Component Checklist

- [ ] TypeScript types for all props
- [ ] Default values where appropriate
- [ ] Error states handled
- [ ] Loading states handled
- [ ] Accessible (keyboard + screen reader)
- [ ] Responsive design applied
- [ ] Follows naming conventions
- [ ] Extracted to appropriate directory

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Component | kebab-case | `user-card.tsx` |
| Page | folder/page.tsx | `users/page.tsx` |
| Hook | use-*.ts | `use-users.ts` |
| Utility | kebab-case | `format-date.ts` |
| Type | kebab-case | `user.ts` |
| Schema | *.schema.ts | `user.schema.ts` |

### Import Order

```tsx
// 1. React/Next
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal - components
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/features/users/user-card';

// 4. Internal - utilities
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

// 5. Internal - types
import type { User } from '@/types';

// 6. Relative imports
import { UserActions } from './user-actions';
```

---

## External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
- [Radix UI](https://www.radix-ui.com)
