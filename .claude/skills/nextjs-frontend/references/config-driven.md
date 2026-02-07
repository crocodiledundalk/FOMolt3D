# Config-Driven Development

Patterns for building maintainable, config-driven applications that avoid hardcoded values and enable easy customization.

## Use When

- Avoiding hardcoded values throughout the app
- Making features configurable
- Building reusable components with variants
- Managing environment-specific settings
- Creating admin-configurable interfaces

---

## Configuration Files

### App Configuration

```tsx
// lib/config/app.ts
export const appConfig = {
  name: 'AppName',
  description: 'Application description',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Feature flags
  features: {
    darkMode: true,
    notifications: true,
    analytics: process.env.NODE_ENV === 'production',
    maintenance: false,
  },

  // Limits
  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxUploadFiles: 10,
    itemsPerPage: 20,
    maxSearchResults: 100,
  },

  // External links
  links: {
    docs: 'https://docs.example.com',
    support: 'https://support.example.com',
    twitter: 'https://twitter.com/example',
    github: 'https://github.com/example',
  },

  // Contact
  contact: {
    email: 'support@example.com',
    phone: '+1-555-123-4567',
  },
} as const;

export type AppConfig = typeof appConfig;
```

### Navigation Configuration

```tsx
// lib/config/navigation.ts
import {
  Home,
  Users,
  Settings,
  BarChart,
  FileText,
  HelpCircle,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  permission?: string;
  badge?: string | number;
  external?: boolean;
  children?: NavItem[];
}

export const mainNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart,
    permission: 'analytics:read',
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    permission: 'users:read',
    children: [
      { title: 'All Users', href: '/users' },
      { title: 'Add User', href: '/users/new', permission: 'users:create' },
      { title: 'Roles', href: '/users/roles', permission: 'roles:read' },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/settings/general' },
      { title: 'Security', href: '/settings/security' },
      { title: 'Billing', href: '/settings/billing' },
    ],
  },
];

export const footerNavigation: NavItem[] = [
  { title: 'Help', href: '/help', icon: HelpCircle },
  { title: 'Documentation', href: appConfig.links.docs, external: true },
];

export const adminNavigation: NavItem[] = [
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    permission: 'admin:access',
    children: [
      { title: 'System', href: '/admin/system' },
      { title: 'Audit Log', href: '/admin/audit' },
    ],
  },
];
```

### Form Field Configuration

```tsx
// lib/config/forms.ts
import { z } from 'zod';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: z.ZodType;
}

export const userFormFields: FieldConfig[] = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
    required: true,
    validation: z.string().min(2, 'Name must be at least 2 characters'),
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    validation: z.string().email('Invalid email address'),
  },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: [
      { value: 'user', label: 'User' },
      { value: 'admin', label: 'Administrator' },
      { value: 'manager', label: 'Manager' },
    ],
    validation: z.enum(['user', 'admin', 'manager']),
  },
  {
    name: 'bio',
    label: 'Bio',
    type: 'textarea',
    placeholder: 'Tell us about yourself...',
    description: 'Brief description (max 500 characters)',
    validation: z.string().max(500).optional(),
  },
  {
    name: 'notifications',
    label: 'Email notifications',
    type: 'checkbox',
    description: 'Receive email updates about your account',
  },
];

// Generate Zod schema from field configs
export function generateSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodType> = {};

  fields.forEach((field) => {
    if (field.validation) {
      shape[field.name] = field.required
        ? field.validation
        : field.validation.optional();
    }
  });

  return z.object(shape);
}
```

---

## Feature Flags

### Feature Flag Configuration

```tsx
// lib/config/features.ts
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environments?: ('development' | 'staging' | 'production')[];
  rolloutPercentage?: number;
}

export const featureFlags: Record<string, FeatureFlag> = {
  newDashboard: {
    key: 'newDashboard',
    name: 'New Dashboard',
    description: 'Enable the redesigned dashboard',
    enabled: true,
    environments: ['development', 'staging'],
  },
  darkMode: {
    key: 'darkMode',
    name: 'Dark Mode',
    description: 'Enable dark mode toggle',
    enabled: true,
  },
  betaFeatures: {
    key: 'betaFeatures',
    name: 'Beta Features',
    description: 'Show beta features to users',
    enabled: false,
    rolloutPercentage: 10,
  },
  aiAssistant: {
    key: 'aiAssistant',
    name: 'AI Assistant',
    description: 'Enable AI-powered assistant',
    enabled: process.env.NEXT_PUBLIC_AI_ENABLED === 'true',
  },
};

// Feature flag hook
export function useFeatureFlag(key: string): boolean {
  const flag = featureFlags[key];

  if (!flag) return false;
  if (!flag.enabled) return false;

  // Check environment
  if (flag.environments) {
    const env = process.env.NODE_ENV as 'development' | 'staging' | 'production';
    if (!flag.environments.includes(env)) return false;
  }

  // Check rollout percentage (would need user ID for real implementation)
  if (flag.rolloutPercentage !== undefined) {
    // Simplified - in real app, use user ID hash
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  return true;
}
```

### Feature Flag Component

```tsx
// components/shared/feature-flag.tsx
'use client';

import { useFeatureFlag } from '@/lib/config/features';

interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlag({ flag, children, fallback }: FeatureFlagProps) {
  const isEnabled = useFeatureFlag(flag);

  if (!isEnabled) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

// Usage
<FeatureFlag flag="newDashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FeatureFlag>
```

---

## Table Column Configuration

### Dynamic Table Columns

```tsx
// lib/config/table-columns.ts
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';

export interface ColumnConfig<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  width?: string;
  format?: 'date' | 'currency' | 'badge' | 'boolean';
  badgeVariants?: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>;
}

export function createColumns<T>(configs: ColumnConfig<T>[]): ColumnDef<T>[] {
  return configs
    .filter((config) => config.visible !== false)
    .map((config) => ({
      accessorKey: config.key as string,
      header: config.sortable
        ? ({ column }) => (
            <SortableHeader column={column}>{config.label}</SortableHeader>
          )
        : config.label,
      cell: ({ row }) => {
        const value = row.getValue(config.key as string);

        switch (config.format) {
          case 'date':
            return formatDate(value as Date);
          case 'currency':
            return formatCurrency(value as number);
          case 'badge':
            const variant = config.badgeVariants?.[value as string] ?? 'default';
            return <Badge variant={variant}>{value as string}</Badge>;
          case 'boolean':
            return value ? 'Yes' : 'No';
          default:
            return value as string;
        }
      },
      enableSorting: config.sortable ?? false,
      enableColumnFilter: config.filterable ?? false,
      size: config.width ? parseInt(config.width) : undefined,
    }));
}

// Usage
const userColumnConfigs: ColumnConfig<User>[] = [
  { key: 'name', label: 'Name', sortable: true, filterable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', format: 'badge', badgeVariants: { admin: 'default', user: 'secondary' } },
  { key: 'status', label: 'Status', format: 'badge', badgeVariants: { active: 'default', inactive: 'destructive' } },
  { key: 'createdAt', label: 'Created', sortable: true, format: 'date' },
];

const columns = createColumns(userColumnConfigs);
```

---

## Dashboard Configuration

### Widget Configuration

```tsx
// lib/config/dashboard.ts
import { BarChart, Users, DollarSign, Activity } from 'lucide-react';

export interface StatWidget {
  id: string;
  title: string;
  icon: LucideIcon;
  queryKey: string[];
  endpoint: string;
  format?: 'number' | 'currency' | 'percentage';
  color?: string;
}

export interface ChartWidget {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  queryKey: string[];
  endpoint: string;
  span?: 1 | 2; // Grid columns
}

export const dashboardConfig = {
  stats: [
    {
      id: 'totalUsers',
      title: 'Total Users',
      icon: Users,
      queryKey: ['stats', 'users'],
      endpoint: '/api/stats/users',
      format: 'number',
    },
    {
      id: 'revenue',
      title: 'Revenue',
      icon: DollarSign,
      queryKey: ['stats', 'revenue'],
      endpoint: '/api/stats/revenue',
      format: 'currency',
    },
    {
      id: 'growth',
      title: 'Growth',
      icon: Activity,
      queryKey: ['stats', 'growth'],
      endpoint: '/api/stats/growth',
      format: 'percentage',
    },
  ] as StatWidget[],

  charts: [
    {
      id: 'revenueChart',
      title: 'Revenue Over Time',
      type: 'area',
      queryKey: ['charts', 'revenue'],
      endpoint: '/api/charts/revenue',
      span: 2,
    },
    {
      id: 'usersByRole',
      title: 'Users by Role',
      type: 'pie',
      queryKey: ['charts', 'users-role'],
      endpoint: '/api/charts/users-role',
      span: 1,
    },
  ] as ChartWidget[],
};
```

### Config-Driven Dashboard

```tsx
// components/features/dashboard/dashboard.tsx
'use client';

import { dashboardConfig } from '@/lib/config/dashboard';
import { StatCard } from './stat-card';
import { ChartWidget } from './chart-widget';

export function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardConfig.stats.map((stat) => (
          <StatCard key={stat.id} config={stat} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {dashboardConfig.charts.map((chart) => (
          <ChartWidget
            key={chart.id}
            config={chart}
            className={chart.span === 2 ? 'md:col-span-2' : ''}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Constants and Enums

### Status Constants

```tsx
// lib/constants/status.ts
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const USER_STATUS_CONFIG: Record<
  UserStatus,
  { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  [USER_STATUS.ACTIVE]: {
    label: 'Active',
    color: 'green',
    badgeVariant: 'default',
  },
  [USER_STATUS.INACTIVE]: {
    label: 'Inactive',
    color: 'gray',
    badgeVariant: 'secondary',
  },
  [USER_STATUS.PENDING]: {
    label: 'Pending',
    color: 'yellow',
    badgeVariant: 'outline',
  },
  [USER_STATUS.SUSPENDED]: {
    label: 'Suspended',
    color: 'red',
    badgeVariant: 'destructive',
  },
};

// Usage
const status = USER_STATUS.ACTIVE;
const config = USER_STATUS_CONFIG[status];
<Badge variant={config.badgeVariant}>{config.label}</Badge>
```

### Role Constants

```tsx
// lib/constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ADMIN]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.USER]: 2,
  [ROLES.VIEWER]: 1,
};

export const ROLE_CONFIG: Record<Role, { label: string; description: string }> = {
  [ROLES.ADMIN]: {
    label: 'Administrator',
    description: 'Full access to all features',
  },
  [ROLES.MANAGER]: {
    label: 'Manager',
    description: 'Can manage users and content',
  },
  [ROLES.USER]: {
    label: 'User',
    description: 'Standard user access',
  },
  [ROLES.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only access',
  },
};

export function hasHigherRole(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}
```

---

## Environment Configuration

### Environment Variables

```tsx
// lib/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public (available in browser)
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),

  // Private (server only)
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
});

// Validate at build time
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;
```

### Runtime Configuration

```tsx
// lib/config/runtime.ts
// Configuration that can be changed without rebuild

export const runtimeConfig = {
  // Can be fetched from API or CDN
  maintenance: {
    enabled: false,
    message: 'We are currently performing scheduled maintenance.',
    endTime: null as Date | null,
  },

  // Feature rollouts
  rollouts: {
    newCheckout: 0.5, // 50% of users
    aiFeatures: 0.1, // 10% of users
  },

  // A/B test variants
  experiments: {
    buttonColor: ['blue', 'green', 'orange'],
    headerLayout: ['centered', 'left-aligned'],
  },
};
```

---

## Config-Driven Forms

### Dynamic Form Builder

```tsx
// components/forms/dynamic-form.tsx
'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateSchema, type FieldConfig } from '@/lib/config/forms';
import { FormField } from './form-field';
import { Button } from '@/components/ui/button';

interface DynamicFormProps {
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
}

export function DynamicForm({
  fields,
  onSubmit,
  defaultValues,
  submitLabel = 'Submit',
}: DynamicFormProps) {
  const schema = generateSchema(fields);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field) => (
          <FormField key={field.name} config={field} />
        ))}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
      </form>
    </FormProvider>
  );
}
```

---

## Best Practices

### 1. Single Source of Truth

```tsx
// Define once, use everywhere
import { USER_STATUS } from '@/lib/constants/status';

// Don't hardcode values
if (status === USER_STATUS.ACTIVE) // Good
if (status === 'active') // Bad
```

### 2. Type Safety

```tsx
// Use const assertions and derived types
export const ROLES = { ADMIN: 'admin', USER: 'user' } as const;
export type Role = typeof ROLES[keyof typeof ROLES];
```

### 3. Environment Validation

```tsx
// Validate env vars at build time
const envSchema = z.object({...});
const env = envSchema.parse(process.env);
```

### 4. Centralized Configuration

```tsx
// lib/config/index.ts - export all configs
export * from './app';
export * from './navigation';
export * from './features';
```

### 5. Config Documentation

```tsx
// Document config options
export interface AppConfig {
  /** Application name displayed in header */
  name: string;
  /** Maximum file upload size in bytes */
  maxFileSize: number;
}
```

---

## External Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Zod](https://zod.dev/) for validation
- [TypeScript const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
