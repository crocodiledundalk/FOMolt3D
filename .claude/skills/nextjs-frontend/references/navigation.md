# Navigation

Patterns for implementing navigation systems including headers, sidebars, breadcrumbs, and mobile navigation.

## Use When

- Building main navigation headers
- Creating dashboard sidebars
- Implementing mobile navigation menus
- Adding breadcrumb navigation
- Creating tabbed interfaces

---

## Header Navigation

### Main Header

```tsx
// components/layouts/header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { MobileNav } from './mobile-nav';
import { UserMenu } from '@/components/auth/user-menu';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/team', label: 'Team' },
  { href: '/settings', label: 'Settings' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Logo className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">AppName</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}
```

### Active Link Component

```tsx
// components/shared/nav-link.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}

export function NavLink({
  href,
  children,
  className,
  activeClassName = 'text-foreground',
  exact = false,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors hover:text-primary',
        isActive ? activeClassName : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}
```

---

## Mobile Navigation

### Sheet-Based Mobile Nav

```tsx
// components/layouts/mobile-nav.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-8">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

### Bottom Navigation (Mobile)

```tsx
// components/layouts/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full',
                'text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

---

## Sidebar Navigation

### Collapsible Sidebar

```tsx
// components/layouts/sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && <span className="font-bold">AppName</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
```

### Nested Sidebar Navigation

```tsx
// components/layouts/nested-sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  href?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  {
    label: 'Users',
    icon: Users,
    children: [
      { href: '/users', label: 'All Users' },
      { href: '/users/new', label: 'Add User' },
      { href: '/users/roles', label: 'Roles' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { href: '/settings/general', label: 'General' },
      { href: '/settings/security', label: 'Security' },
      { href: '/settings/billing', label: 'Billing' },
    ],
  },
];

export function NestedSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background">
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function NavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((child) => pathname === child.href);

  const [open, setOpen] = useState(isActive);

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2',
              'hover:bg-muted',
              isActive && 'bg-muted'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                open && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-4 mt-1 space-y-1 border-l pl-4">
            {item.children?.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href!}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm',
                    pathname === child.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <li>
      <Link
        href={item.href!}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2',
          pathname === item.href
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
      >
        {item.icon && <item.icon className="h-4 w-4" />}
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    </li>
  );
}
```

---

## Breadcrumbs

### Breadcrumb Component

```tsx
// components/shared/breadcrumbs.tsx
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-2">
        <li>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'text-sm',
                    isLast ? 'font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

### Auto-Generated Breadcrumbs

```tsx
// lib/hooks/use-breadcrumbs.ts
'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

// Map segments to readable labels
const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label =
        segmentLabels[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);

      return { label, href };
    });
  }, [pathname]);
}

// Usage
function PageHeader() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header>
      <Breadcrumbs items={breadcrumbs} />
      <h1>{breadcrumbs[breadcrumbs.length - 1]?.label}</h1>
    </header>
  );
}
```

---

## Tabs Navigation

### Route-Based Tabs

```tsx
// components/shared/tabs-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TabItem {
  href: string;
  label: string;
}

interface TabsNavProps {
  items: TabItem[];
  className?: string;
}

export function TabsNav({ items, className }: TabsNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn('border-b', className)}
      role="tablist"
      aria-label="Navigation tabs"
    >
      <div className="flex gap-8">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative py-4 text-sm font-medium transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Usage in layout
// app/settings/layout.tsx
const tabs = [
  { href: '/settings/general', label: 'General' },
  { href: '/settings/security', label: 'Security' },
  { href: '/settings/billing', label: 'Billing' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <TabsNav items={tabs} className="mb-6" />
      {children}
    </div>
  );
}
```

---

## Pagination

### Pagination Component

```tsx
// components/shared/pagination.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1; // Pages on each side of current

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {/* Previous */}
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage === 1}
      >
        <Link
          href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="px-3 py-2">
              ...
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            asChild
          >
            <Link href={createPageUrl(page)} aria-label={`Page ${page}`}>
              {page}
            </Link>
          </Button>
        );
      })}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage === totalPages}
      >
        <Link
          href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </nav>
  );
}
```

---

## Navigation Config

### Centralized Navigation Config

```tsx
// lib/config/navigation.ts
import {
  Home,
  Users,
  Settings,
  BarChart,
  FileText,
  HelpCircle,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string | number;
  children?: NavItem[];
}

export const mainNavigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Analytics', href: '/analytics', icon: BarChart },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    permission: 'users:read',
    children: [
      { title: 'All Users', href: '/users' },
      { title: 'Add User', href: '/users/new', permission: 'users:create' },
    ],
  },
  { title: 'Documents', href: '/documents', icon: FileText },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings:read',
  },
];

export const footerNavigation: NavItem[] = [
  { title: 'Help', href: '/help', icon: HelpCircle },
  { title: 'Documentation', href: '/docs', icon: FileText },
];
```

---

## Best Practices

### 1. Use Next.js Link Component

```tsx
// Good - enables prefetching
<Link href="/dashboard">Dashboard</Link>

// Avoid - no prefetching
<a href="/dashboard">Dashboard</a>
```

### 2. Indicate Active State

```tsx
// Always show which page user is on
const isActive = pathname === item.href;
className={cn(isActive ? 'bg-primary' : 'bg-transparent')}
```

### 3. Support Keyboard Navigation

```tsx
// Use semantic elements
<nav>
  <ul>
    <li><Link>...</Link></li>
  </ul>
</nav>
```

### 4. Mobile-First Design

```tsx
// Hide desktop nav on mobile, show mobile nav
<nav className="hidden md:flex">...</nav>
<MobileNav className="md:hidden" />
```

### 5. Respect Permissions

```tsx
// Filter nav items by user permissions
const visibleItems = navItems.filter(
  (item) => !item.permission || can(item.permission)
);
```

---

## External Resources

- [Next.js Link](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)
- [ARIA Navigation Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/navigation/)
