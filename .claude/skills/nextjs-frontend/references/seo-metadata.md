# SEO & Metadata

Patterns for implementing SEO and metadata management in Next.js applications.

## Use When

- Setting page titles and descriptions
- Implementing Open Graph and Twitter cards
- Managing structured data (JSON-LD)
- Creating dynamic sitemaps
- Handling canonical URLs

---

## Static Metadata

### Basic Metadata

```tsx
// app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | My App',
  description: 'Welcome to My App - the best solution for your needs',
  keywords: ['nextjs', 'react', 'web development'],
};

export default function HomePage() {
  return <main>...</main>;
}
```

### Comprehensive Metadata

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://myapp.com'),
  title: {
    default: 'My App',
    template: '%s | My App', // Page titles become "Page Name | My App"
  },
  description: 'The best app for your needs',
  applicationName: 'My App',
  authors: [{ name: 'Company Name', url: 'https://company.com' }],
  creator: 'Company Name',
  publisher: 'Company Name',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://myapp.com',
    siteName: 'My App',
    title: 'My App',
    description: 'The best app for your needs',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'My App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@myapp',
    creator: '@myapp',
    title: 'My App',
    description: 'The best app for your needs',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://myapp.com',
    languages: {
      'en-US': 'https://myapp.com/en-US',
      'es-ES': 'https://myapp.com/es-ES',
    },
  },
};
```

---

## Dynamic Metadata

### Page-Specific Metadata

```tsx
// app/products/[id]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const product = await getProduct(params.id);

  // Optionally extend parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image, ...previousImages],
      url: `/products/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}
```

### Blog Post Metadata

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author.name }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: `/blog/${params.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}
```

---

## Structured Data (JSON-LD)

### JSON-LD Component

```tsx
// components/shared/json-ld.tsx
interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### Organization Schema

```tsx
// app/layout.tsx
import { JsonLd } from '@/components/shared/json-ld';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'My Company',
  url: 'https://mycompany.com',
  logo: 'https://mycompany.com/logo.png',
  sameAs: [
    'https://twitter.com/mycompany',
    'https://linkedin.com/company/mycompany',
    'https://github.com/mycompany',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-555-123-4567',
    contactType: 'customer service',
  },
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <JsonLd data={organizationSchema} />
        {children}
      </body>
    </html>
  );
}
```

### Product Schema

```tsx
// app/products/[id]/page.tsx
import { JsonLd } from '@/components/shared/json-ld';

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: `https://myapp.com/products/${params.id}`,
      priceCurrency: 'USD',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating.average,
          reviewCount: product.rating.count,
        }
      : undefined,
  };

  return (
    <>
      <JsonLd data={productSchema} />
      <ProductDetails product={product} />
    </>
  );
}
```

### Article Schema

```tsx
// app/blog/[slug]/page.tsx
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  description: post.excerpt,
  image: post.coverImage,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: {
    '@type': 'Person',
    name: post.author.name,
    url: post.author.url,
  },
  publisher: {
    '@type': 'Organization',
    name: 'My Blog',
    logo: {
      '@type': 'ImageObject',
      url: 'https://myblog.com/logo.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://myblog.com/blog/${post.slug}`,
  },
};
```

### Breadcrumb Schema

```tsx
// components/shared/breadcrumbs-schema.tsx
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={schema} />;
}
```

---

## Sitemap

### Static Sitemap

```tsx
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://myapp.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://myapp.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://myapp.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];
}
```

### Dynamic Sitemap

```tsx
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://myapp.com';

  // Static pages
  const staticPages = [
    { url: baseUrl, priority: 1 },
    { url: `${baseUrl}/about`, priority: 0.8 },
    { url: `${baseUrl}/contact`, priority: 0.5 },
  ];

  // Dynamic pages - products
  const products = await getProducts();
  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic pages - blog posts
  const posts = await getPosts();
  const postPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages.map((page) => ({
      ...page,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
    })),
    ...productPages,
    ...postPages,
  ];
}
```

---

## Robots.txt

### Static Robots

```tsx
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/private/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    sitemap: 'https://myapp.com/sitemap.xml',
  };
}
```

### Environment-Aware Robots

```tsx
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Block all crawlers in non-production
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://myapp.com/sitemap.xml',
  };
}
```

---

## Canonical URLs

### Setting Canonical URLs

```tsx
// app/products/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://myapp.com/products/${params.id}`,
    },
  };
}
```

### Handling Pagination

```tsx
// app/blog/page.tsx
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { page?: string };
}): Promise<Metadata> {
  const page = parseInt(searchParams.page || '1');

  return {
    title: page > 1 ? `Blog - Page ${page}` : 'Blog',
    alternates: {
      canonical: 'https://myapp.com/blog', // Always canonical to page 1
    },
  };
}
```

---

## Social Media Images

### Open Graph Images

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'My App';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom, #000, #333)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        My App
      </div>
    ),
    { ...size }
  );
}
```

### Dynamic OG Images

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          background: '#000',
          color: '#fff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 'bold' }}>{post.title}</div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 24 }}>
          {post.author.name}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

---

## Best Practices

### 1. Unique Titles and Descriptions

```tsx
// Each page should have unique title and description
// Don't duplicate across pages
```

### 2. Character Limits

```tsx
// Title: 50-60 characters
// Description: 150-160 characters
// Keep important info at the start
```

### 3. Test Social Cards

```tsx
// Use validators:
// - https://cards-dev.twitter.com/validator
// - https://developers.facebook.com/tools/debug/
```

### 4. Monitor in Search Console

```tsx
// Regularly check Google Search Console for:
// - Indexing issues
// - Mobile usability
// - Core Web Vitals
```

---

## External Resources

- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
