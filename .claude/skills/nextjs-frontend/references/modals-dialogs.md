# Modals & Dialogs

Patterns for implementing modals, dialogs, sheets, and other overlay components.

## Use When

- Displaying confirmation dialogs
- Creating form modals
- Implementing side panels/sheets
- Building command palettes
- Managing overlay state

---

## Dialog Component

### Basic Dialog

```tsx
// components/ui/dialog.tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'bg-background p-6 shadow-lg rounded-lg border',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

---

## Confirmation Dialog

### Reusable Confirm Dialog

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Delete Confirmation

```tsx
// components/features/users/delete-user-dialog.tsx
'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useDeleteUser } from '@/lib/hooks/use-users';

interface DeleteUserDialogProps {
  user: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: DeleteUserDialogProps) {
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete User"
      description={`Are you sure you want to delete ${user.name}? This action cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={handleDelete}
      isLoading={deleteUser.isPending}
    />
  );
}
```

---

## Form Dialog

### Dialog with Form

```tsx
// components/features/users/create-user-dialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUser } from '@/lib/hooks/use-users';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await createUser.mutateAsync(data);
    reset();
    onOpenChange(false);
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new user to the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Sheet (Side Panel)

### Sheet Component

```tsx
// components/ui/sheet.tsx
'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
));

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
};
```

### Detail Panel Sheet

```tsx
// components/features/users/user-detail-sheet.tsx
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';

interface UserDetailSheetProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
}: UserDetailSheetProps) {
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>View user information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge>{user.role}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                {user.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## Modal State Management

### useModal Hook

```tsx
// lib/hooks/use-modal.ts
'use client';

import { useState, useCallback } from 'react';

export function useModal<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((modalData?: T) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear data after animation
    setTimeout(() => setData(undefined), 300);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    setIsOpen,
  };
}

// Usage
function UserList() {
  const deleteModal = useModal<User>();
  const editModal = useModal<User>();

  return (
    <>
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          onEdit={() => editModal.open(user)}
          onDelete={() => deleteModal.open(user)}
        />
      ))}

      <DeleteUserDialog
        user={deleteModal.data}
        open={deleteModal.isOpen}
        onOpenChange={deleteModal.setIsOpen}
      />

      <EditUserDialog
        user={editModal.data}
        open={editModal.isOpen}
        onOpenChange={editModal.setIsOpen}
      />
    </>
  );
}
```

### Global Modal Store

```tsx
// lib/stores/modal-store.ts
import { create } from 'zustand';

type ModalType = 'createUser' | 'editUser' | 'deleteUser' | 'settings' | null;

interface ModalState {
  type: ModalType;
  data: unknown;
  isOpen: boolean;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  type: null,
  data: null,
  isOpen: false,
  openModal: (type, data) => set({ type, data, isOpen: true }),
  closeModal: () => set({ type: null, data: null, isOpen: false }),
}));

// Modal provider component
export function ModalProvider() {
  const { type, data, isOpen, closeModal } = useModalStore();

  return (
    <>
      <CreateUserDialog
        open={type === 'createUser' && isOpen}
        onOpenChange={(open) => !open && closeModal()}
      />

      <EditUserDialog
        user={data as User}
        open={type === 'editUser' && isOpen}
        onOpenChange={(open) => !open && closeModal()}
      />

      <DeleteUserDialog
        user={data as User}
        open={type === 'deleteUser' && isOpen}
        onOpenChange={(open) => !open && closeModal()}
      />
    </>
  );
}
```

---

## Command Palette

### Command Dialog

```tsx
// components/shared/command-palette.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Settings, User, FileText, Home } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Open with keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
            <FileText className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/users'))}>
            <User className="mr-2 h-4 w-4" />
            Users
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

## Best Practices

### 1. Always Handle Escape Key

```tsx
// Radix handles this automatically
// But for custom modals, ensure escape closes
```

### 2. Trap Focus

```tsx
// Keep focus within modal while open
// Return focus to trigger when closed
```

### 3. Manage Scroll Lock

```tsx
// Prevent body scroll when modal is open
// Radix handles this automatically
```

### 4. Animate Enter/Exit

```tsx
// Use data-[state=open/closed] for CSS animations
// Or AnimatePresence for Framer Motion
```

### 5. Clear Form State on Close

```tsx
const handleOpenChange = (open: boolean) => {
  if (!open) {
    reset(); // Reset form
  }
  onOpenChange(open);
};
```

---

## External Resources

- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Radix Alert Dialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
