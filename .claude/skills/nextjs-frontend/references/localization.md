# Localization (i18n)

Patterns for implementing internationalization and localization in Next.js applications.

## Use When

- Building multi-language applications
- Formatting dates, numbers, and currencies by locale
- Handling right-to-left (RTL) languages
- Managing translation files
- Implementing language switching

---

## Setup with next-intl

### Install Dependencies

```bash
npm install next-intl
```

### Configuration

```tsx
// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'fr', 'de', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### Middleware Configuration

```tsx
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // or 'always', 'never'
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Directory Structure

```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── dashboard/
│       └── page.tsx
messages/
├── en.json
├── es.json
├── fr.json
├── de.json
└── ja.json
```

---

## Translation Files

### Message Structure

```json
// messages/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "noResults": "No results found"
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "settings": "Settings",
    "profile": "Profile",
    "logout": "Log out"
  },
  "auth": {
    "login": "Sign in",
    "register": "Sign up",
    "forgotPassword": "Forgot password?",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm password",
    "invalidCredentials": "Invalid email or password"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {name}!",
    "stats": {
      "totalUsers": "Total Users",
      "revenue": "Revenue",
      "growth": "Growth"
    }
  },
  "users": {
    "title": "Users",
    "addUser": "Add User",
    "editUser": "Edit User",
    "deleteUser": "Delete User",
    "confirmDelete": "Are you sure you want to delete {name}?",
    "userCreated": "User created successfully",
    "userUpdated": "User updated successfully",
    "userDeleted": "User deleted successfully"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email",
    "minLength": "Must be at least {min} characters",
    "maxLength": "Must be at most {max} characters"
  },
  "time": {
    "justNow": "Just now",
    "minutesAgo": "{count, plural, one {# minute} other {# minutes}} ago",
    "hoursAgo": "{count, plural, one {# hour} other {# hours}} ago",
    "daysAgo": "{count, plural, one {# day} other {# days}} ago"
  }
}
```

```json
// messages/es.json
{
  "common": {
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "search": "Buscar",
    "noResults": "No se encontraron resultados"
  },
  "navigation": {
    "home": "Inicio",
    "dashboard": "Panel",
    "settings": "Configuración",
    "profile": "Perfil",
    "logout": "Cerrar sesión"
  }
}
```

---

## Using Translations

### In Server Components

```tsx
// app/[locale]/dashboard/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: 'John' })}</p>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t('stats.totalUsers')} />
        <StatCard title={t('stats.revenue')} />
        <StatCard title={t('stats.growth')} />
      </div>
    </div>
  );
}
```

### In Client Components

```tsx
// components/features/users/user-form.tsx
'use client';

import { useTranslations } from 'next-intl';

export function UserForm() {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');

  return (
    <form>
      <h2>{t('addUser')}</h2>

      {/* Form fields */}

      <div className="flex gap-2">
        <Button type="submit">{tCommon('save')}</Button>
        <Button type="button" variant="outline">
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
```

### With Variables

```tsx
// Interpolation
t('welcome', { name: user.name })
// "Welcome back, John!"

// Pluralization
t('time.minutesAgo', { count: 5 })
// "5 minutes ago"

// HTML in translations
<p>{t.rich('terms', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>
})}</p>
```

---

## Language Switcher

### Language Switcher Component

```tsx
// components/shared/language-switcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locales, type Locale } from '@/i18n';

const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    // Replace locale in pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Link with Locale

```tsx
// components/shared/localized-link.tsx
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface LocalizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LocalizedLink({ href, children, className }: LocalizedLinkProps) {
  const locale = useLocale();
  const localizedHref = `/${locale}${href}`;

  return (
    <Link href={localizedHref} className={className}>
      {children}
    </Link>
  );
}
```

---

## Number and Date Formatting

### Number Formatting

```tsx
// lib/utils/format.ts
import { useLocale } from 'next-intl';

export function useNumberFormat() {
  const locale = useLocale();

  return {
    format: (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(value);
    },

    formatCurrency: (value: number, currency = 'USD') => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(value);
    },

    formatPercent: (value: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    },

    formatCompact: (value: number) => {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(value);
    },
  };
}

// Usage
const { formatCurrency, formatCompact } = useNumberFormat();
formatCurrency(1234.56); // "$1,234.56" (en-US) or "1.234,56 €" (de-DE)
formatCompact(1500000); // "1.5M"
```

### Date Formatting

```tsx
// lib/utils/date.ts
import { useLocale } from 'next-intl';

export function useDateFormat() {
  const locale = useLocale();

  return {
    format: (date: Date, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, options).format(date);
    },

    formatShort: (date: Date) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
      }).format(date);
    },

    formatLong: (date: Date) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
      }).format(date);
    },

    formatDateTime: (date: Date) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    },

    formatRelative: (date: Date) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const diff = date.getTime() - Date.now();
      const days = Math.round(diff / (1000 * 60 * 60 * 24));

      if (Math.abs(days) < 1) {
        const hours = Math.round(diff / (1000 * 60 * 60));
        if (Math.abs(hours) < 1) {
          const minutes = Math.round(diff / (1000 * 60));
          return rtf.format(minutes, 'minute');
        }
        return rtf.format(hours, 'hour');
      }

      return rtf.format(days, 'day');
    },
  };
}
```

### Formatted Components

```tsx
// components/shared/formatted-date.tsx
'use client';

import { useDateFormat } from '@/lib/utils/date';

interface FormattedDateProps {
  date: Date | string;
  format?: 'short' | 'long' | 'datetime' | 'relative';
}

export function FormattedDate({ date, format = 'short' }: FormattedDateProps) {
  const { formatShort, formatLong, formatDateTime, formatRelative } = useDateFormat();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatted = {
    short: formatShort,
    long: formatLong,
    datetime: formatDateTime,
    relative: formatRelative,
  }[format](dateObj);

  return <time dateTime={dateObj.toISOString()}>{formatted}</time>;
}
```

---

## RTL Support

### RTL Configuration

```tsx
// lib/utils/rtl.ts
export const rtlLocales = ['ar', 'he', 'fa', 'ur'] as const;
export type RTLLocale = (typeof rtlLocales)[number];

export function isRTL(locale: string): boolean {
  return rtlLocales.includes(locale as RTLLocale);
}
```

### Layout with RTL Support

```tsx
// app/[locale]/layout.tsx
import { isRTL } from '@/lib/utils/rtl';

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### RTL-Aware Components

```tsx
// components/shared/icon-button.tsx
import { cn } from '@/lib/utils';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  iconPosition?: 'start' | 'end';
}

export function IconButton({
  icon: Icon,
  label,
  iconPosition = 'start',
}: IconButtonProps) {
  return (
    <Button
      className={cn(
        'flex items-center gap-2',
        // RTL-aware: use logical properties
        iconPosition === 'end' && 'flex-row-reverse'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
```

### RTL-Safe CSS

```css
/* Use logical properties instead of physical */

/* Good - RTL aware */
.container {
  padding-inline-start: 1rem; /* left in LTR, right in RTL */
  padding-inline-end: 2rem;
  margin-block-start: 1rem;
  border-inline-start: 1px solid;
}

/* Avoid - not RTL aware */
.container {
  padding-left: 1rem;
  padding-right: 2rem;
}
```

---

## SEO and Metadata

### Localized Metadata

```tsx
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('home.title'),
    description: t('home.description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        es: '/es',
        fr: '/fr',
      },
    },
  };
}
```

### Hreflang Tags

```tsx
// app/[locale]/layout.tsx
import { locales } from '@/i18n';

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      <head>
        {locales.map((loc) => (
          <link
            key={loc}
            rel="alternate"
            hrefLang={loc}
            href={`/${loc}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="/en" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Translation Management

### Type-Safe Translations

```tsx
// types/messages.ts
// Auto-generate from en.json for type safety
import en from '@/messages/en.json';

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
```

### Missing Translation Handling

```tsx
// i18n.ts
export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
  onError: (error) => {
    if (error.code === 'MISSING_MESSAGE') {
      console.warn(`Missing translation: ${error.key}`);
    } else {
      throw error;
    }
  },
  getMessageFallback: ({ key, namespace }) => {
    // Return key as fallback
    return `${namespace}.${key}`;
  },
}));
```

---

## Best Practices

### 1. Use Namespaces

```tsx
// Organize translations by feature
const t = useTranslations('dashboard');
const tCommon = useTranslations('common');
```

### 2. Keep Keys Meaningful

```json
// Good
{ "users.confirmDelete": "Are you sure?" }

// Avoid
{ "msg1": "Are you sure?" }
```

### 3. Support Pluralization

```json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

### 4. Use ICU Message Format

```json
{
  "greeting": "{gender, select, male {Mr.} female {Ms.} other {}} {name}"
}
```

### 5. Extract Strings Early

```tsx
// Extract all user-facing strings from day one
// Even if only supporting one language initially
```

---

## External Resources

- [next-intl](https://next-intl-docs.vercel.app/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Intl APIs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [RTL Styling Guide](https://rtlstyling.com/)
