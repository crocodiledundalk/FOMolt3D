# Responsive Design

Patterns for implementing consistent responsive layouts across breakpoints with mobile-first approach.

## Use When

- Building layouts that work across devices
- Creating mobile and desktop variants of components
- Setting up consistent breakpoint usage
- Implementing responsive navigation

---

## Breakpoint System

### Tailwind Default Breakpoints

```tsx
// Tailwind breakpoints (mobile-first)
// sm: 640px   - Small tablets
// md: 768px   - Tablets
// lg: 1024px  - Small laptops
// xl: 1280px  - Desktops
// 2xl: 1536px - Large screens
```

### Custom Breakpoint Configuration

```ts
// tailwind.config.ts
const config = {
  theme: {
    screens: {
      'xs': '475px',    // Large phones
      'sm': '640px',    // Small tablets
      'md': '768px',    // Tablets
      'lg': '1024px',   // Laptops
      'xl': '1280px',   // Desktops
      '2xl': '1400px',  // Large desktops (adjusted for container)
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
      screens: {
        '2xl': '1400px',
      },
    },
  },
};
```

---

## Mobile-First Approach

### Base Mobile, Enhance for Larger

```tsx
// Mobile-first pattern
<div className="
  flex flex-col          /* Mobile: stack vertically */
  md:flex-row            /* Tablet+: side by side */
  gap-4
  md:gap-6               /* More space on larger screens */
">
  <div className="w-full md:w-1/3">Sidebar</div>
  <div className="w-full md:w-2/3">Content</div>
</div>
```

### Grid Responsive Pattern

```tsx
// Responsive grid columns
<div className="
  grid
  grid-cols-1           /* Mobile: 1 column */
  sm:grid-cols-2        /* Small tablets: 2 columns */
  lg:grid-cols-3        /* Laptops: 3 columns */
  xl:grid-cols-4        /* Desktops: 4 columns */
  gap-4
  md:gap-6
">
  <Card />
  <Card />
  <Card />
  <Card />
</div>
```

---

## Common Responsive Patterns

### Page Layout

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header with mobile menu */}
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-16 items-center gap-4 px-4 md:px-6">
            {/* Mobile menu button */}
            <MobileNav className="lg:hidden" />

            <div className="flex-1" />

            {/* Header actions */}
            <HeaderActions />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Responsive Container

```tsx
// Consistent page container
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8">
      {children}
    </div>
  );
}

// Max width container for content
export function ContentContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6">
      {children}
    </div>
  );
}
```

### Responsive Spacing

```tsx
// Section spacing
<section className="py-8 md:py-12 lg:py-16">
  <div className="space-y-4 md:space-y-6 lg:space-y-8">
    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
      Section Title
    </h2>
    <p className="text-base md:text-lg text-muted-foreground">
      Description text that adjusts size.
    </p>
  </div>
</section>
```

---

## Responsive Components

### Responsive Navigation

```tsx
// components/layouts/header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/settings', label: 'Settings' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">Logo</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>

        {/* Mobile menu */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
```

### Responsive Card Grid

```tsx
// components/features/dashboard/stats-grid.tsx
interface StatsGridProps {
  stats: Array<{
    title: string;
    value: string;
    change?: string;
  }>;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Responsive Table

```tsx
// Horizontal scroll on mobile, full table on desktop
<div className="w-full overflow-auto">
  <Table className="min-w-[600px]">
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead className="hidden sm:table-cell">Email</TableHead>
        <TableHead className="hidden md:table-cell">Role</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map((user) => (
        <TableRow key={user.id}>
          <TableCell>
            <div>
              <p className="font-medium">{user.name}</p>
              {/* Show email on mobile under name */}
              <p className="sm:hidden text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
          <TableCell className="hidden md:table-cell">{user.role}</TableCell>
          <TableCell>
            <Badge>{user.status}</Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="sm">Edit</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

---

## Media Query Hook

### useMediaQuery Hook

```tsx
// lib/hooks/use-media-query.ts
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Convenience hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
```

### Usage Example

```tsx
'use client';

import { useIsMobile } from '@/lib/hooks/use-media-query';

export function ResponsiveComponent() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileView />;
  }

  return <DesktopView />;
}
```

---

## Responsive Typography

### Fluid Typography

```tsx
// Responsive text sizes
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Page Title
</h1>

<p className="text-sm sm:text-base md:text-lg">
  Body text that scales with screen size.
</p>
```

### Typography Component

```tsx
// components/ui/heading.tsx
import { cn } from '@/lib/utils';

interface HeadingProps {
  level: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

const headingStyles = {
  1: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
  2: 'text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight',
  3: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
  4: 'text-lg sm:text-xl lg:text-2xl font-medium',
};

export function Heading({ level, children, className }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag className={cn(headingStyles[level], className)}>
      {children}
    </Tag>
  );
}
```

---

## Responsive Images

### Next.js Image Responsive

```tsx
import Image from 'next/image';

// Responsive image with different sizes
<div className="relative aspect-video w-full">
  <Image
    src="/hero.jpg"
    alt="Hero image"
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    className="object-cover rounded-lg"
    priority
  />
</div>

// Different images for different screens
<picture>
  <source
    media="(min-width: 1024px)"
    srcSet="/hero-desktop.jpg"
  />
  <source
    media="(min-width: 768px)"
    srcSet="/hero-tablet.jpg"
  />
  <Image
    src="/hero-mobile.jpg"
    alt="Hero"
    width={800}
    height={600}
    className="w-full h-auto"
  />
</picture>
```

---

## Responsive Visibility

### Show/Hide Utilities

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Show only on specific breakpoint range
<div className="hidden sm:block lg:hidden">Tablet only</div>
```

### Responsive Component Variants

```tsx
// components/features/users/user-display.tsx
interface UserDisplayProps {
  user: User;
}

export function UserDisplay({ user }: UserDisplayProps) {
  return (
    <>
      {/* Mobile: compact card */}
      <div className="md:hidden">
        <UserCardCompact user={user} />
      </div>

      {/* Desktop: full card */}
      <div className="hidden md:block">
        <UserCardFull user={user} />
      </div>
    </>
  );
}
```

---

## Responsive Spacing Constants

### Consistent Spacing

```tsx
// lib/constants/spacing.ts
export const spacing = {
  page: {
    x: 'px-4 md:px-6 lg:px-8',
    y: 'py-4 md:py-6 lg:py-8',
    all: 'p-4 md:p-6 lg:p-8',
  },
  section: {
    y: 'py-8 md:py-12 lg:py-16',
    gap: 'space-y-6 md:space-y-8 lg:space-y-10',
  },
  card: {
    padding: 'p-4 md:p-6',
    gap: 'space-y-3 md:space-y-4',
  },
} as const;

// Usage
<section className={spacing.section.y}>
  <div className={spacing.section.gap}>
    ...
  </div>
</section>
```

---

## Testing Responsive Layouts

### Viewport Testing

```tsx
// In Playwright or Cypress
const viewports = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1280, height: 800, name: 'Desktop' },
  { width: 1920, height: 1080, name: 'Full HD' },
];

viewports.forEach(({ width, height, name }) => {
  test(`renders correctly on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot(`dashboard-${name}.png`);
  });
});
```

---

## Best Practices

### 1. Mobile-First Always

```tsx
// Good - mobile first
className="flex flex-col md:flex-row"

// Avoid - desktop first
className="flex flex-row md:flex-col"
```

### 2. Test at All Breakpoints

- Test at: 320px, 375px, 768px, 1024px, 1280px
- Check for text overflow, image sizing, touch targets

### 3. Use Container Queries (When Supported)

```css
/* Container queries for component-level responsiveness */
@container (min-width: 400px) {
  .card-content {
    display: flex;
  }
}
```

### 4. Consistent Breakpoint Usage

```tsx
// Define breakpoints once, use everywhere
// Don't mix arbitrary values with Tailwind breakpoints
```

### 5. Touch Target Sizes

```tsx
// Minimum 44x44px touch targets on mobile
<Button className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
  Click
</Button>
```

---

## External Resources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image)
- [Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
