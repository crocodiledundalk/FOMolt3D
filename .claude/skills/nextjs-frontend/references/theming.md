# Theming

Implementation patterns for light/dark mode and theme customization in Next.js applications.

## Use When

- Implementing light/dark mode toggle
- Creating custom brand themes
- Setting up theme persistence
- Ensuring proper theme flashing prevention

---

## Theme Provider Setup

### Install Dependencies

```bash
npm install next-themes
```

### Theme Provider

```tsx
// providers/theme-provider.tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Root Layout Integration

```tsx
// app/layout.tsx
import { ThemeProvider } from '@/providers/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Theme Toggle Component

### Basic Toggle

```tsx
// components/shared/theme-toggle.tsx
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Simple Toggle Button

```tsx
// components/shared/theme-switch.tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## CSS Variables for Theming

### Complete Theme Definition

```css
/* app/globals.css */
@layer base {
  :root {
    /* Light mode colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    --radius: 0.5rem;

    /* Chart colors */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    /* Sidebar (for dashboard layouts) */
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
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

    /* Chart colors - adjusted for dark mode */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;

    /* Sidebar dark */
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}
```

---

## Theme Customization

### Brand Colors

```css
/* Custom brand theme */
:root {
  /* Override primary with brand color */
  --primary: 262 83% 58%;  /* Purple brand */
  --primary-foreground: 0 0% 100%;

  /* Adjust accent to match */
  --accent: 262 83% 95%;
  --accent-foreground: 262 83% 25%;
}

.dark {
  --primary: 262 83% 68%;
  --primary-foreground: 262 83% 10%;
}
```

### Multiple Theme Variants

```tsx
// lib/config/themes.ts
export const themes = {
  default: {
    name: 'Default',
    cssClass: '',
  },
  blue: {
    name: 'Ocean Blue',
    cssClass: 'theme-blue',
  },
  green: {
    name: 'Forest Green',
    cssClass: 'theme-green',
  },
  purple: {
    name: 'Royal Purple',
    cssClass: 'theme-purple',
  },
} as const;

export type ThemeVariant = keyof typeof themes;
```

```css
/* Additional theme variants */
.theme-blue {
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --ring: 217 91% 60%;
}

.theme-green {
  --primary: 142 76% 36%;
  --primary-foreground: 0 0% 100%;
  --ring: 142 76% 36%;
}

.theme-purple {
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  --ring: 262 83% 58%;
}

/* Dark mode variants */
.dark.theme-blue {
  --primary: 217 91% 70%;
  --primary-foreground: 217 91% 10%;
}

.dark.theme-green {
  --primary: 142 76% 46%;
  --primary-foreground: 142 76% 10%;
}

.dark.theme-purple {
  --primary: 262 83% 68%;
  --primary-foreground: 262 83% 10%;
}
```

### Theme Selector Component

```tsx
// components/shared/theme-customizer.tsx
'use client';

import { useTheme } from 'next-themes';
import { themes, type ThemeVariant } from '@/lib/config/themes';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeCustomizer() {
  const [variant, setVariant] = useState<ThemeVariant>('default');

  const applyVariant = (newVariant: ThemeVariant) => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      ...Object.values(themes).map((t) => t.cssClass).filter(Boolean)
    );

    // Add new theme class
    if (themes[newVariant].cssClass) {
      document.documentElement.classList.add(themes[newVariant].cssClass);
    }

    setVariant(newVariant);
    localStorage.setItem('theme-variant', newVariant);
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme-variant') as ThemeVariant;
    if (saved && themes[saved]) {
      applyVariant(saved);
    }
  }, []);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Color Theme</h4>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(themes) as ThemeVariant[]).map((key) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => applyVariant(key)}
            className={cn(
              'justify-start',
              variant === key && 'border-primary'
            )}
          >
            {variant === key && <Check className="mr-2 h-4 w-4" />}
            {themes[key].name}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

---

## Preventing Flash of Unstyled Content

### Script in Head

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const resolvedTheme = theme === 'system' || !theme ? systemTheme : theme;
                document.documentElement.classList.add(resolvedTheme);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Disable Transitions on Theme Change

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange  // Prevents flash during switch
>
```

---

## Theme-Aware Components

### Conditional Rendering Based on Theme

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export function ThemedLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-32 bg-muted animate-pulse rounded" />;
  }

  return (
    <Image
      src={resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
      width={128}
      height={32}
    />
  );
}
```

### CSS-Only Theme Switching for Images

```tsx
// No hydration issues with CSS-only approach
export function ThemedLogo() {
  return (
    <>
      <Image
        src="/logo-light.svg"
        alt="Logo"
        width={128}
        height={32}
        className="dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        alt="Logo"
        width={128}
        height={32}
        className="hidden dark:block"
      />
    </>
  );
}
```

---

## Theme Hook

### Custom Theme Hook

```tsx
// lib/hooks/use-theme-config.ts
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useThemeConfig() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    theme,
    setTheme,
    resolvedTheme: mounted ? resolvedTheme : undefined,
    systemTheme: mounted ? systemTheme : undefined,
    isDark: mounted ? resolvedTheme === 'dark' : undefined,
    isLight: mounted ? resolvedTheme === 'light' : undefined,
    isSystem: theme === 'system',
    mounted,
  };
}
```

---

## Dark Mode Design Principles

### Color Adjustments

1. **Don't just invert** - Dark mode isn't white-on-black
2. **Reduce contrast slightly** - Pure white (#fff) is harsh; use off-white
3. **Adjust saturation** - Colors may need to be less saturated in dark mode
4. **Maintain hierarchy** - Visual hierarchy should be consistent

### Surface Elevation

```css
/* Dark mode elevation through lightness */
.dark {
  --background: 222 47% 6%;      /* Base */
  --card: 222 47% 8%;             /* Elevated */
  --popover: 222 47% 10%;         /* Higher elevation */
}
```

### Shadow Adjustments

```css
/* Shadows need adjustment in dark mode */
.card {
  @apply shadow-sm;
}

.dark .card {
  @apply shadow-none border border-border;
}
```

---

## Best Practices

### 1. Always Handle Hydration

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Skeleton />;
```

### 2. Use CSS Variables

```tsx
// Good - CSS variable
className="bg-background text-foreground"

// Avoid - conditional classes
className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
```

### 3. Test Both Themes

- Always check components in both light and dark mode
- Test theme switching during interactions
- Verify color contrast meets accessibility standards

### 4. Persist Preference

```tsx
// next-themes handles this automatically
// But for custom preferences:
localStorage.setItem('theme-variant', variant);
```

---

## External Resources

- [next-themes](https://github.com/pacocoursey/next-themes)
- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [Radix Colors](https://www.radix-ui.com/colors)
