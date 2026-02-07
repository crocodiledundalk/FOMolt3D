# Component Patterns

Patterns for creating reusable, consistent, and maintainable React components in Next.js applications.

## Use When

- Creating new components
- Refactoring existing components for reusability
- Deciding between component abstraction levels
- Implementing component variants and states

---

## Component Categories

### 1. Primitive Components (UI)

Low-level, highly reusable components from shadcn/ui:

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### 2. Composite Components

Combine primitives for specific purposes:

```tsx
// components/shared/confirm-dialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant={variant} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3. Feature Components

Domain-specific components:

```tsx
// components/features/users/user-card.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
          {user.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{user.role}</p>
      </CardContent>
      {(onEdit || onDelete) && (
        <CardFooter className="gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(user)}>
              Delete
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
```

### 4. Layout Components

Structure and spacing components:

```tsx
// components/shared/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

---

## Composition Patterns

### Compound Components

For complex components with multiple parts:

```tsx
// components/shared/stats-card.tsx
import { cn } from '@/lib/utils';

interface StatsCardProps {
  children: React.ReactNode;
  className?: string;
}

function StatsCard({ children, className }: StatsCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {children}
    </div>
  );
}

function StatsCardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-muted-foreground">{children}</h3>
  );
}

function StatsCardValue({ children }: { children: React.ReactNode }) {
  return <p className="text-2xl font-bold">{children}</p>;
}

function StatsCardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}

// Attach sub-components
StatsCard.Title = StatsCardTitle;
StatsCard.Value = StatsCardValue;
StatsCard.Description = StatsCardDescription;

export { StatsCard };

// Usage
<StatsCard>
  <StatsCard.Title>Total Revenue</StatsCard.Title>
  <StatsCard.Value>$45,231.89</StatsCard.Value>
  <StatsCard.Description>+20.1% from last month</StatsCard.Description>
</StatsCard>
```

### Render Props

For flexible rendering control:

```tsx
// components/shared/data-list.tsx
interface DataListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyState,
  className,
}: DataListProps<T>) {
  if (items.length === 0) {
    return emptyState ?? <EmptyState message="No items found" />;
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
<DataList
  items={users}
  keyExtractor={(user) => user.id}
  renderItem={(user) => <UserCard user={user} />}
  emptyState={<EmptyState message="No users yet" />}
/>
```

### Slots Pattern

For flexible content insertion:

```tsx
// components/shared/card-with-slots.tsx
interface CardWithSlotsProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function CardWithSlots({
  header,
  children,
  footer,
  sidebar,
}: CardWithSlotsProps) {
  return (
    <div className="rounded-lg border bg-card">
      {header && (
        <div className="border-b px-6 py-4">{header}</div>
      )}
      <div className="flex">
        <div className="flex-1 p-6">{children}</div>
        {sidebar && (
          <div className="w-64 border-l p-6">{sidebar}</div>
        )}
      </div>
      {footer && (
        <div className="border-t px-6 py-4">{footer}</div>
      )}
    </div>
  );
}
```

---

## Props Patterns

### Required vs Optional Props

```tsx
interface UserCardProps {
  // Required - no default makes sense
  user: User;

  // Optional with undefined default
  onEdit?: (user: User) => void;

  // Optional with specific default
  showActions?: boolean;  // default: true

  // Styling override
  className?: string;
}

export function UserCard({
  user,
  onEdit,
  showActions = true,
  className,
}: UserCardProps) {
  // ...
}
```

### Discriminated Unions

For mutually exclusive props:

```tsx
type ButtonProps =
  | { variant: 'link'; href: string; onClick?: never }
  | { variant?: 'default' | 'secondary'; onClick?: () => void; href?: never };

// Ensures href only with link variant
```

### Polymorphic Components

Components that can render as different elements:

```tsx
// components/ui/typography.tsx
import { cn } from '@/lib/utils';

type TextElement = 'p' | 'span' | 'div' | 'label';

interface TextProps<T extends TextElement> {
  as?: T;
  variant?: 'default' | 'muted' | 'small';
  children: React.ReactNode;
  className?: string;
}

export function Text<T extends TextElement = 'p'>({
  as,
  variant = 'default',
  children,
  className,
  ...props
}: TextProps<T> & React.ComponentPropsWithoutRef<T>) {
  const Component = as || 'p';

  return (
    <Component
      className={cn(
        variant === 'default' && 'text-base',
        variant === 'muted' && 'text-sm text-muted-foreground',
        variant === 'small' && 'text-xs',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Usage
<Text>Default paragraph</Text>
<Text as="span" variant="muted">Muted span</Text>
```

---

## State Patterns

### Controlled Components

Parent manages state:

```tsx
interface ControlledInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ControlledInput({
  value,
  onChange,
  placeholder,
}: ControlledInputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border rounded px-3 py-2"
    />
  );
}

// Usage
const [name, setName] = useState('');
<ControlledInput value={name} onChange={setName} />
```

### Uncontrolled with Defaults

Component manages own state with optional control:

```tsx
interface ToggleProps {
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Toggle({
  defaultChecked = false,
  checked: controlledChecked,
  onChange,
}: ToggleProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = () => {
    const newValue = !checked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={handleChange}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      {/* Toggle indicator */}
    </button>
  );
}
```

---

## Loading & Error States

### Component with States

```tsx
interface AsyncComponentProps<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  renderData: (data: T) => React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function AsyncComponent<T>({
  data,
  isLoading,
  error,
  renderData,
  loadingFallback = <Skeleton />,
  errorFallback,
}: AsyncComponentProps<T>) {
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    return errorFallback ?? <ErrorState error={error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return <>{renderData(data)}</>;
}
```

### Skeleton Pattern

Create skeletons matching component structure:

```tsx
// components/features/users/user-card.tsx
export function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>...</Avatar>
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      </CardHeader>
    </Card>
  );
}

// components/features/users/user-card-skeleton.tsx
export function UserCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardHeader>
    </Card>
  );
}
```

---

## When to Create New Components

### Create a New Component When:

1. **Used 2+ times** - DRY principle
2. **Exceeds ~100 lines** - Cognitive load
3. **Has clear responsibility** - Single purpose
4. **Improves testability** - Isolated testing
5. **Different loading state** - Needs own skeleton

### Keep Together When:

1. **Tightly coupled** - Always used together
2. **Single use** - Page-specific
3. **Simple composition** - Just styling

### Component Extraction Checklist

```tsx
// Before: Inline repeated pattern
function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <div key={user.id} className="flex items-center gap-4 p-4 border rounded">
          <img src={user.avatar} className="h-10 w-10 rounded-full" />
          <div>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// After: Extracted component
function UserList({ users }) {
  return (
    <div className="space-y-2">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. Single Responsibility

```tsx
// Bad - Does too much
function UserDashboard() {
  const users = useUsers();
  const stats = useStats();
  // 200+ lines of mixed concerns
}

// Good - Composed of focused components
function UserDashboard() {
  return (
    <div className="space-y-6">
      <DashboardStats />
      <UserList />
      <RecentActivity />
    </div>
  );
}
```

### 2. Props Interface First

```tsx
// Define interface before component
interface UserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  // Implementation
}
```

### 3. Consistent Export Style

```tsx
// Named exports for components
export function UserCard() { ... }
export function UserList() { ... }

// Default export only for pages
export default function UsersPage() { ... }
```

### 4. Forward Refs When Needed

```tsx
import { forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn('border rounded px-3 py-2', className)}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
```

---

## External Resources

- [React Patterns](https://reactpatterns.com/)
- [Radix UI](https://www.radix-ui.com/primitives)
- [shadcn/ui](https://ui.shadcn.com)
- [Class Variance Authority](https://cva.style/docs)
