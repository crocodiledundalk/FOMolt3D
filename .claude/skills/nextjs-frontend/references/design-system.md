# Design System

Comprehensive style guide for visual consistency across the application including spacing, typography, colors, and component styling.

## Use When

- Setting up a new project's visual foundation
- Ensuring consistent spacing and typography
- Creating or modifying component styles
- Implementing brand guidelines
- Onboarding new developers to the design language

---

## Design Tokens

### Tailwind Configuration

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
```

### CSS Variables

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background and foreground */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* Card surfaces */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* Popover surfaces */
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Primary brand color */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    /* Secondary color */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* Muted/subtle elements */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* Accent for highlights */
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Destructive/danger */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* Borders and inputs */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* Border radius */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Spacing System

### Consistent Spacing Scale

Use Tailwind's spacing scale consistently:

| Token | Value | Use Case |
|-------|-------|----------|
| `1` | 0.25rem (4px) | Tiny gaps |
| `2` | 0.5rem (8px) | Tight spacing |
| `3` | 0.75rem (12px) | Compact elements |
| `4` | 1rem (16px) | Default spacing |
| `6` | 1.5rem (24px) | Section spacing |
| `8` | 2rem (32px) | Large gaps |
| `12` | 3rem (48px) | Section dividers |
| `16` | 4rem (64px) | Page sections |

### Spacing Patterns

```tsx
// Page layout spacing
<div className="space-y-6">  {/* Between major sections */}
  <PageHeader />
  <div className="space-y-4">  {/* Between content blocks */}
    <Card />
    <Card />
  </div>
</div>

// Card internal spacing
<Card className="p-6">  {/* Card padding */}
  <div className="space-y-4">  {/* Content spacing */}
    <h3>Title</h3>
    <p>Content</p>
  </div>
</Card>

// Form spacing
<form className="space-y-4">  {/* Between form fields */}
  <FormField />
  <FormField />
  <div className="flex gap-2">  {/* Button group */}
    <Button>Cancel</Button>
    <Button>Submit</Button>
  </div>
</form>

// Inline elements
<div className="flex items-center gap-2">  {/* Icon + text */}
  <Icon />
  <span>Label</span>
</div>
```

### Standard Measurements

```tsx
// Page containers
<div className="container mx-auto px-4 py-8">

// Sidebar width
<aside className="w-64">  {/* 256px */}

// Max content width
<div className="max-w-2xl">  {/* 672px - for readability */}

// Card widths
<Card className="w-full max-w-md">  {/* 448px max */}
```

---

## Typography

### Font Configuration

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### Typography Scale

```tsx
// Headings
<h1 className="text-4xl font-bold tracking-tight">Page Title</h1>
<h2 className="text-3xl font-semibold tracking-tight">Section Title</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<h4 className="text-xl font-semibold">Card Title</h4>
<h5 className="text-lg font-medium">Small Title</h5>

// Body text
<p className="text-base">Regular paragraph</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<p className="text-xs text-muted-foreground">Caption/helper text</p>

// Special text
<code className="font-mono text-sm">code</code>
<span className="font-medium">Emphasis</span>
<span className="text-primary">Branded text</span>
```

### Typography Components

```tsx
// components/ui/typography.tsx
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function H1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn('text-4xl font-bold tracking-tight', className)}>
      {children}
    </h1>
  );
}

export function H2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn('text-3xl font-semibold tracking-tight', className)}>
      {children}
    </h2>
  );
}

export function Lead({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-xl text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function Muted({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}
```

---

## Color Usage

### Semantic Colors

```tsx
// Backgrounds
className="bg-background"       // Page background
className="bg-card"             // Card/elevated surfaces
className="bg-muted"            // Subtle backgrounds
className="bg-accent"           // Highlighted areas

// Text
className="text-foreground"     // Primary text
className="text-muted-foreground" // Secondary text
className="text-primary"        // Brand/accent text

// Borders
className="border-border"       // Default borders
className="border-input"        // Form inputs

// Interactive states
className="hover:bg-accent"     // Hover state
className="focus:ring-ring"     // Focus state
```

### Status Colors

```tsx
// Success
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
  Active
</Badge>

// Warning
<Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
  Pending
</Badge>

// Error
<Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
  Failed
</Badge>

// Info
<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
  New
</Badge>
```

### Status Color Constants

```tsx
// lib/constants/colors.ts
export const statusColors = {
  success: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-100',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-100',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-100',
    border: 'border-red-200 dark:border-red-800',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800',
  },
} as const;
```

---

## Component Styling Standards

### Buttons

```tsx
// Primary actions
<Button>Save Changes</Button>

// Secondary actions
<Button variant="secondary">Cancel</Button>

// Destructive actions
<Button variant="destructive">Delete</Button>

// Subtle actions
<Button variant="ghost">Edit</Button>
<Button variant="outline">More Options</Button>

// Link style
<Button variant="link">Learn more</Button>
```

### Cards

```tsx
// Standard card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
  <CardFooter>
    Actions
  </CardFooter>
</Card>

// Interactive card
<Card className="cursor-pointer transition-shadow hover:shadow-md">
  ...
</Card>

// Selected card
<Card className="ring-2 ring-primary">
  ...
</Card>
```

### Forms

```tsx
// Standard form layout
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" placeholder="Enter name" />
  </div>

  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Enter email" />
    <p className="text-xs text-muted-foreground">
      We'll never share your email.
    </p>
  </div>

  <div className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Submit</Button>
  </div>
</form>
```

### Tables

```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox />
        </TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>
          <Checkbox />
        </TableCell>
        <TableCell className="font-medium">John Doe</TableCell>
        <TableCell>
          <Badge>Active</Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

---

## Consistent Patterns

### Page Structure

```tsx
export default function Page() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
          <p className="text-muted-foreground">Page description here.</p>
        </div>
        <Button>Primary Action</Button>
      </div>

      {/* Main content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard />
        <StatsCard />
        <StatsCard />
        <StatsCard />
      </div>

      {/* Data section */}
      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-3">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="mt-4 text-lg font-semibold">No items yet</h3>
  <p className="mt-2 text-sm text-muted-foreground max-w-sm">
    Get started by creating your first item.
  </p>
  <Button className="mt-4">
    <Plus className="mr-2 h-4 w-4" />
    Add Item
  </Button>
</div>
```

### Loading States

```tsx
// Full page loading
<div className="flex items-center justify-center min-h-[400px]">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>

// Inline loading
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

---

## Utility Classes

### cn() Helper

```tsx
// lib/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  className // Allow override
)} />
```

### Common Combinations

```tsx
// Centered content
className="flex items-center justify-center"

// Space between
className="flex items-center justify-between"

// Responsive grid
className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"

// Truncate text
className="truncate"

// Line clamp
className="line-clamp-2"

// Hover effects
className="transition-colors hover:bg-accent"

// Focus ring
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Best Practices

### 1. Use Semantic Tokens

```tsx
// Good - semantic
className="bg-background text-foreground"
className="bg-card text-card-foreground"
className="text-muted-foreground"

// Avoid - hard-coded
className="bg-white text-black"
className="bg-gray-100 text-gray-600"
```

### 2. Consistent Spacing

```tsx
// Good - consistent scale
className="p-4 space-y-4"
className="p-6 space-y-6"

// Avoid - arbitrary values
className="p-[13px] space-y-[7px]"
```

### 3. Mobile-First

```tsx
// Good - mobile-first
className="flex flex-col md:flex-row"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Avoid - desktop-first
className="flex flex-row md:flex-col"
```

### 4. Component Consistency

```tsx
// All cards should have same radius and padding
<Card className="rounded-lg p-6">

// All buttons should use variants
<Button variant="default" size="default">
```

---

## External Resources

- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [Radix Colors](https://www.radix-ui.com/colors)
- [Typography Plugin](https://tailwindcss.com/docs/typography-plugin)
