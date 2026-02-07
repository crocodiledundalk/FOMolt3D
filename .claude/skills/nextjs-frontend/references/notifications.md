# Notifications

Patterns for implementing toast notifications, alerts, and in-app notification systems.

## Use When

- Showing success/error feedback after actions
- Displaying system alerts
- Implementing notification centers
- Building real-time notification feeds
- Creating dismissible messages

---

## Toast Notifications with Sonner

### Setup

```bash
npm install sonner
```

### Toast Provider

```tsx
// app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'bg-background border-border',
              title: 'text-foreground',
              description: 'text-muted-foreground',
              success: 'bg-green-50 dark:bg-green-950 border-green-200',
              error: 'bg-red-50 dark:bg-red-950 border-red-200',
            },
          }}
        />
      </body>
    </html>
  );
}
```

### Basic Usage

```tsx
'use client';

import { toast } from 'sonner';

export function NotificationExamples() {
  return (
    <div className="space-y-2">
      {/* Basic toasts */}
      <Button onClick={() => toast('Default notification')}>
        Default
      </Button>

      <Button onClick={() => toast.success('Successfully saved!')}>
        Success
      </Button>

      <Button onClick={() => toast.error('Something went wrong')}>
        Error
      </Button>

      <Button onClick={() => toast.warning('Please review your changes')}>
        Warning
      </Button>

      <Button onClick={() => toast.info('New features available')}>
        Info
      </Button>

      {/* With description */}
      <Button
        onClick={() =>
          toast.success('User created', {
            description: 'The user has been added to the system.',
          })
        }
      >
        With Description
      </Button>

      {/* With action */}
      <Button
        onClick={() =>
          toast('File deleted', {
            action: {
              label: 'Undo',
              onClick: () => console.log('Undo clicked'),
            },
          })
        }
      >
        With Action
      </Button>

      {/* Promise toast */}
      <Button
        onClick={() => {
          toast.promise(saveData(), {
            loading: 'Saving...',
            success: 'Data saved successfully!',
            error: 'Failed to save data',
          });
        }}
      >
        Promise Toast
      </Button>
    </div>
  );
}
```

### Custom Toast Components

```tsx
// components/shared/custom-toast.tsx
'use client';

import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToastOptions {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export function showSuccessToast(options: ToastOptions) {
  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 bg-background border rounded-lg p-4 shadow-lg">
        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">{options.title}</p>
          {options.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {options.description}
            </p>
          )}
          {options.action && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto mt-2"
              onClick={() => {
                options.action?.onClick();
                toast.dismiss(t);
              }}
            >
              {options.action.label}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => toast.dismiss(t)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ),
    { duration: options.duration }
  );
}

export function showErrorToast(options: ToastOptions) {
  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 bg-destructive/10 border-destructive/20 border rounded-lg p-4 shadow-lg">
        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">{options.title}</p>
          {options.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {options.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => toast.dismiss(t)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ),
    { duration: options.duration ?? 6000 }
  );
}
```

---

## Alert Components

### Alert Component

```tsx
// components/ui/alert.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-500',
        warning:
          'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-500',
        info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const alertIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, children, onDismiss, ...props }, ref) => {
    const Icon = alertIcons[variant ?? 'default'];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-4 w-4" />
        {children}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute right-4 top-4 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
```

### Dismissible Alert

```tsx
// components/shared/dismissible-alert.tsx
'use client';

import { useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface DismissibleAlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title: string;
  description?: string;
  storageKey?: string; // Persist dismissal
}

export function DismissibleAlert({
  variant,
  title,
  description,
  storageKey,
}: DismissibleAlertProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) === 'true';
    }
    return false;
  });

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  if (dismissed) return null;

  return (
    <Alert variant={variant} onDismiss={handleDismiss}>
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
}
```

---

## Notification Center

### Notification Types

```tsx
// types/notification.ts
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  read: boolean;
  createdAt: Date;
  link?: string;
  actionLabel?: string;
  actionUrl?: string;
}
```

### Notification Store

```tsx
// lib/stores/notification-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types/notification';

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      get unreadCount() {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'notifications',
    }
  )
);
```

### Notification Bell

```tsx
// components/shared/notification-bell.tsx
'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { NotificationList } from './notification-list';

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotificationStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount} unread notifications
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <NotificationList notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
}
```

### Notification List

```tsx
// components/shared/notification-list.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/lib/stores/notification-store';
import type { Notification } from '@/types/notification';
import Link from 'next/link';

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const { markAsRead, removeNotification } = useNotificationStore();

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No notifications
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50',
            !notification.read && 'bg-muted/30'
          )}
        >
          <NotificationIcon type={notification.type} />

          <div className="flex-1 min-w-0">
            {notification.link ? (
              <Link
                href={notification.link}
                onClick={() => markAsRead(notification.id)}
                className="font-medium hover:underline"
              >
                {notification.title}
              </Link>
            ) : (
              <p className="font-medium">{notification.title}</p>
            )}

            {notification.message && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {notification.message}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          <div className="flex gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => markAsRead(notification.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeNotification(notification.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  const colors = {
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600',
  };

  return (
    <div className={cn('w-2 h-2 rounded-full mt-2', colors[type])} />
  );
}
```

---

## Mutation Feedback

### With React Query

```tsx
// lib/hooks/use-create-user.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => api.post('/users', data),

    onSuccess: (user) => {
      toast.success('User created', {
        description: `${user.name} has been added to the system.`,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },

    onError: (error) => {
      toast.error('Failed to create user', {
        description: error.message,
      });
    },
  });
}

// Usage in component
function CreateUserButton() {
  const createUser = useCreateUser();

  const handleCreate = () => {
    createUser.mutate({ name: 'John', email: 'john@example.com' });
  };

  return (
    <Button onClick={handleCreate} disabled={createUser.isPending}>
      {createUser.isPending ? 'Creating...' : 'Create User'}
    </Button>
  );
}
```

### Promise-Based Toast

```tsx
// lib/utils/toast.ts
import { toast } from 'sonner';

export async function withToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  return toast.promise(promise, {
    loading: messages.loading,
    success: (data) =>
      typeof messages.success === 'function'
        ? messages.success(data)
        : messages.success,
    error: (error) =>
      typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error,
  });
}

// Usage
await withToast(deleteUser(userId), {
  loading: 'Deleting user...',
  success: 'User deleted successfully',
  error: (err) => `Failed to delete: ${err.message}`,
});
```

---

## Banner Notifications

### App Banner

```tsx
// components/shared/app-banner.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppBannerProps {
  variant?: 'info' | 'warning' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  storageKey?: string;
}

const variantStyles = {
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-500 text-yellow-950',
  error: 'bg-red-600 text-white',
};

export function AppBanner({
  variant = 'info',
  message,
  action,
  dismissible = true,
  storageKey,
}: AppBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      return sessionStorage.getItem(storageKey) === 'true';
    }
    return false;
  });

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      sessionStorage.setItem(storageKey, 'true');
    }
  };

  if (dismissed) return null;

  return (
    <div className={cn('px-4 py-2 text-sm text-center', variantStyles[variant])}>
      <div className="container flex items-center justify-center gap-4">
        <span>{message}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="font-medium underline underline-offset-2"
          >
            {action.label}
          </button>
        )}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-4 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Be Concise

```tsx
// Good - clear and concise
toast.success('User created');

// Avoid - too verbose
toast.success('The user account has been successfully created in the system');
```

### 2. Provide Actions When Relevant

```tsx
// Good - undo action for destructive operations
toast('Item deleted', {
  action: { label: 'Undo', onClick: handleUndo },
});
```

### 3. Use Appropriate Duration

```tsx
// Short for success messages
toast.success('Saved', { duration: 2000 });

// Longer for errors users need to read
toast.error('Connection failed. Check your internet.', { duration: 6000 });
```

### 4. Don't Overuse Notifications

```tsx
// Avoid notifying for every small action
// Only notify for significant events or when user feedback is needed
```

### 5. Position Consistently

```tsx
// Choose one position and stick with it
<Toaster position="bottom-right" />
```

---

## External Resources

- [Sonner](https://sonner.emilkowal.ski/)
- [React Hot Toast](https://react-hot-toast.com/)
- [ARIA Live Regions](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
