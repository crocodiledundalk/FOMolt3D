# Performance Optimization

Patterns for optimizing Next.js application performance including code splitting, lazy loading, and static asset optimization.

## Use When

- Improving initial page load times
- Optimizing bundle size
- Implementing lazy loading strategies
- Setting up efficient caching
- Optimizing Core Web Vitals

---

## Code Splitting

### Dynamic Imports

```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic';

// Basic dynamic import
const HeavyChart = dynamic(() => import('@/components/features/charts/heavy-chart'), {
  loading: () => <ChartSkeleton />,
});

// Disable SSR for client-only components
const ClientOnlyMap = dynamic(
  () => import('@/components/features/maps/interactive-map'),
  { ssr: false }
);

// With named exports
const ModalContent = dynamic(
  () => import('@/components/shared/modal').then((mod) => mod.ModalContent)
);
```

### Route-Based Splitting

```tsx
// app/dashboard/analytics/page.tsx
// Next.js automatically code-splits by route
// Each page is its own chunk

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}

// Heavy components within a page should be dynamically imported
import dynamic from 'next/dynamic';

const AdvancedCharts = dynamic(
  () => import('@/components/features/analytics/advanced-charts'),
  { loading: () => <ChartsSkeleton /> }
);
```

### Component-Level Splitting

```tsx
// lib/lazy-components.ts
import dynamic from 'next/dynamic';

// Centralize lazy-loaded components
export const LazyRichTextEditor = dynamic(
  () => import('@/components/shared/rich-text-editor'),
  {
    loading: () => <div className="h-64 bg-muted animate-pulse rounded-md" />,
    ssr: false
  }
);

export const LazyCodeEditor = dynamic(
  () => import('@/components/shared/code-editor'),
  {
    loading: () => <div className="h-96 bg-muted animate-pulse rounded-md" />,
    ssr: false
  }
);

export const LazyMarkdownPreview = dynamic(
  () => import('@/components/shared/markdown-preview')
);
```

---

## Bundle Optimization

### Analyze Bundle Size

```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Configure in next.config.js
```

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});
```

```bash
# Run analysis
ANALYZE=true npm run build
```

### Tree Shaking Best Practices

```tsx
// Good - import only what you need
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Avoid - importing entire libraries
import * as dateFns from 'date-fns'; // Bad
import _ from 'lodash'; // Bad

// Better - use specific lodash packages
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
```

### Optimize Dependencies

```tsx
// package.json - prefer smaller alternatives
{
  "dependencies": {
    // Instead of moment.js (300kb), use:
    "date-fns": "^3.0.0",  // ~13kb per function

    // Instead of lodash full:
    "lodash-es": "^4.17.21", // Tree-shakeable

    // Instead of axios for simple cases:
    // Use native fetch
  }
}
```

---

## Image Optimization

### Next.js Image Component

```tsx
import Image from 'next/image';

// Responsive image with automatic optimization
export function HeroImage() {
  return (
    <div className="relative aspect-video">
      <Image
        src="/hero.jpg"
        alt="Hero"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority // For above-the-fold images
        className="object-cover"
      />
    </div>
  );
}

// Fixed size image
export function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="rounded-full"
    />
  );
}
```

### Image Loading Strategies

```tsx
// Priority for LCP images
<Image priority src="/hero.jpg" ... />

// Lazy load below-the-fold images (default)
<Image src="/gallery-item.jpg" loading="lazy" ... />

// Blur placeholder for better perceived performance
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

### Remote Image Configuration

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

---

## Font Optimization

### Next.js Font Loading

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Local Fonts

```tsx
import localFont from 'next/font/local';

const customFont = localFont({
  src: [
    {
      path: '../public/fonts/custom-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/custom-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/custom-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
  display: 'swap',
});
```

---

## Caching Strategies

### Static Generation

```tsx
// app/blog/[slug]/page.tsx
// Static generation at build time
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  return <Article post={post} />;
}
```

### Incremental Static Regeneration

```tsx
// app/products/[id]/page.tsx
// Revalidate every hour
export const revalidate = 3600;

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}

// Or revalidate on demand
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { path, tag } = await request.json();

  if (path) {
    revalidatePath(path);
  }
  if (tag) {
    revalidateTag(tag);
  }

  return Response.json({ revalidated: true });
}
```

### Fetch Caching

```tsx
// Server-side fetch with caching
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: {
      revalidate: 3600, // Cache for 1 hour
      tags: ['products'], // Tag for on-demand revalidation
    },
  });
  return res.json();
}

// No caching
async function getCurrentUser() {
  const res = await fetch('https://api.example.com/me', {
    cache: 'no-store',
  });
  return res.json();
}
```

---

## React Query Optimization

### Query Deduplication

```tsx
// React Query automatically dedupes identical queries
// Multiple components can use the same hook
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Both components share the same cache entry
function UserHeader({ userId }: { userId: string }) {
  const { data: user } = useUser(userId);
  return <header>{user?.name}</header>;
}

function UserDetails({ userId }: { userId: string }) {
  const { data: user } = useUser(userId);
  return <div>{user?.email}</div>;
}
```

### Selective Refetching

```tsx
// Configure refetch behavior
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  refetchOnMount: false, // Don't refetch if data exists
  refetchOnReconnect: true, // Refetch on network reconnect
});
```

### Query Prefetching

```tsx
// Prefetch on hover
function ProductLink({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => fetchProduct(productId),
      staleTime: 60 * 1000,
    });
  };

  return (
    <Link
      href={`/products/${productId}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      View Product
    </Link>
  );
}
```

---

## Rendering Optimization

### React.memo for Expensive Components

```tsx
import { memo } from 'react';

interface DataGridProps {
  data: Item[];
  columns: Column[];
}

export const DataGrid = memo(function DataGrid({
  data,
  columns,
}: DataGridProps) {
  // Expensive render logic
  return (
    <table>
      {/* ... */}
    </table>
  );
});

// With custom comparison
export const OptimizedList = memo(
  function OptimizedList({ items }: { items: Item[] }) {
    return (
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
  },
  (prevProps, nextProps) => {
    // Custom equality check
    return prevProps.items.length === nextProps.items.length &&
      prevProps.items.every((item, i) => item.id === nextProps.items[i].id);
  }
);
```

### useMemo and useCallback

```tsx
'use client';

import { useMemo, useCallback } from 'react';

export function FilteredList({
  items,
  filter,
  onSelect,
}: FilteredListProps) {
  // Memoize expensive computation
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  // Memoize callback to prevent child re-renders
  const handleSelect = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);

  return (
    <ul>
      {filteredItems.map((item) => (
        <ListItem
          key={item.id}
          item={item}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
}
```

### Virtualization for Long Lists

```tsx
// Using @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualizedList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 5, // Render 5 extra items outside viewport
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ListItem item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Core Web Vitals

### Largest Contentful Paint (LCP)

```tsx
// Prioritize LCP elements
<Image
  src="/hero.jpg"
  alt="Hero"
  priority // Preloads the image
  fetchPriority="high"
/>

// Preload critical resources
// app/layout.tsx
export const metadata = {
  other: {
    'link': [
      { rel: 'preload', href: '/fonts/custom.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    ],
  },
};
```

### Cumulative Layout Shift (CLS)

```tsx
// Always specify dimensions for images
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
/>

// Use aspect ratio containers
<div className="relative aspect-video">
  <Image fill src="/video-thumb.jpg" alt="Thumbnail" />
</div>

// Reserve space for dynamic content
<div className="min-h-[200px]">
  {isLoading ? <Skeleton /> : <Content />}
</div>
```

### First Input Delay (FID) / Interaction to Next Paint (INP)

```tsx
// Defer non-critical JavaScript
import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@/components/analytics'), {
  ssr: false,
});

// Use Web Workers for heavy computation
// lib/workers/data-processor.worker.ts
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};

// Usage
const worker = new Worker(
  new URL('@/lib/workers/data-processor.worker', import.meta.url)
);
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

---

## Script Optimization

### Next.js Script Component

```tsx
import Script from 'next/script';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      {/* Load after page is interactive */}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="afterInteractive"
      />

      {/* Load during idle time */}
      <Script
        src="https://widget.example.com/embed.js"
        strategy="lazyOnload"
      />

      {/* Inline script */}
      <Script id="config" strategy="beforeInteractive">
        {`window.CONFIG = { apiUrl: '${process.env.NEXT_PUBLIC_API_URL}' }`}
      </Script>
    </>
  );
}
```

---

## Monitoring Performance

### Web Vitals Reporting

```tsx
// app/layout.tsx or a client component
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to analytics
    console.log(metric);

    // Example: send to custom endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  });

  return null;
}
```

### Performance Marks

```tsx
'use client';

import { useEffect } from 'react';

export function PerformanceTracker({ name }: { name: string }) {
  useEffect(() => {
    // Mark component mount
    performance.mark(`${name}-mounted`);

    return () => {
      // Measure time to unmount
      performance.mark(`${name}-unmounted`);
      performance.measure(
        `${name}-lifecycle`,
        `${name}-mounted`,
        `${name}-unmounted`
      );
    };
  }, [name]);

  return null;
}
```

---

## Best Practices

### 1. Optimize Critical Path

```tsx
// Load critical CSS inline
// Load non-critical CSS async
// Defer non-essential JavaScript
```

### 2. Minimize JavaScript

```tsx
// Use Server Components by default
// Only add 'use client' when needed
// Keep client bundles small
```

### 3. Optimize Third-Party Scripts

```tsx
// Load third-party scripts with appropriate strategy
// Use facades for heavy embeds (YouTube, maps)
// Self-host when possible
```

### 4. Enable Compression

```js
// next.config.js
module.exports = {
  compress: true, // Enabled by default
};
```

### 5. Use Production Builds

```bash
# Always test with production builds
npm run build
npm run start
```

---

## External Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
