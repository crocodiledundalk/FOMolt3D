# Image Optimization

Patterns for optimizing images in Next.js applications using the Image component and related techniques.

## Use When

- Displaying any images in your application
- Implementing responsive images
- Lazy loading images for performance
- Handling image placeholders and loading states
- Working with external image sources

---

## Next.js Image Component

### Basic Usage

```tsx
import Image from 'next/image';

// Local image (auto-optimized)
import heroImage from '@/public/images/hero.jpg';

export function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Hero banner showing product showcase"
      priority // Load immediately for above-the-fold
    />
  );
}

// Remote image (requires dimensions)
export function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src}
      alt={`${name}'s avatar`}
      width={40}
      height={40}
      className="rounded-full"
    />
  );
}
```

### Image Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Remote image domains
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
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],

    // Image formats (defaults are good for most cases)
    formats: ['image/avif', 'image/webp'],

    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Sizes for layout="responsive" or layout="fill"
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimum cache TTL in seconds
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
```

---

## Responsive Images

### Fill Container

```tsx
// Image fills its container
export function BackgroundImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-64 w-full">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}
```

### Responsive Sizes

```tsx
// Different sizes based on viewport
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
    />
  );
}

// Fixed aspect ratio container
export function AspectRatioImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-video">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover rounded-lg"
        sizes="(max-width: 768px) 100vw, 800px"
      />
    </div>
  );
}
```

### Art Direction

```tsx
// Different images for different screen sizes
import Image from 'next/image';

export function ResponsiveBanner() {
  return (
    <>
      {/* Mobile */}
      <div className="block md:hidden relative aspect-square">
        <Image
          src="/banner-mobile.jpg"
          alt="Promotional banner"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Desktop */}
      <div className="hidden md:block relative aspect-[21/9]">
        <Image
          src="/banner-desktop.jpg"
          alt="Promotional banner"
          fill
          className="object-cover"
          priority
        />
      </div>
    </>
  );
}
```

---

## Placeholders and Loading

### Blur Placeholder (Local Images)

```tsx
import Image from 'next/image';
import heroImage from '@/public/images/hero.jpg';

// Automatic blur placeholder for local images
export function HeroWithBlur() {
  return (
    <Image
      src={heroImage}
      alt="Hero image"
      placeholder="blur"
      priority
    />
  );
}
```

### Blur Placeholder (Remote Images)

```tsx
// Generate blurDataURL for remote images
import Image from 'next/image';

// Option 1: Use a tiny base64 placeholder
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="0%" />
      <stop stop-color="#edeef1" offset="20%" />
      <stop stop-color="#f6f7f8" offset="40%" />
      <stop stop-color="#f6f7f8" offset="100%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate
    attributeName="x"
    from="-${w}"
    to="${w}"
    dur="1s"
    repeatCount="indefinite"
  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export function RemoteImageWithShimmer({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(400, 300))}`}
    />
  );
}
```

### Skeleton Placeholder

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function ImageWithSkeleton({
  src,
  alt,
  width,
  height,
  className,
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
```

---

## Image Components

### Avatar Component

```tsx
// components/ui/avatar.tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  className,
}: AvatarProps) {
  const dimension = sizeMap[size];

  if (!src) {
    // Fallback to initials
    const initials = fallback || alt.charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
          className
        )}
        style={{ width: dimension, height: dimension }}
        role="img"
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn('rounded-full object-cover', className)}
    />
  );
}
```

### Optimized Card Image

```tsx
// components/features/product-card.tsx
import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <h3 className="mt-2 font-medium">{product.name}</h3>
      <p className="text-muted-foreground">${product.price}</p>
    </Link>
  );
}
```

### Gallery Component

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface GalleryProps {
  images: { src: string; alt: string }[];
}

export function Gallery({ images }: GalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={selectedImage.src}
          alt={selectedImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md',
              index === selectedIndex && 'ring-2 ring-primary'
            )}
          >
            <Image
              src={image.src}
              alt={`Thumbnail ${index + 1}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Background Images

### CSS Background with Next.js

```tsx
// For decorative backgrounds, CSS can be more appropriate
export function HeroSection() {
  return (
    <section
      className="relative h-[600px] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-white">Hero Title</h1>
      </div>
    </section>
  );
}
```

### Optimized Background with Image Component

```tsx
// Better for LCP - uses Next.js optimization
export function OptimizedHero() {
  return (
    <section className="relative h-[600px]">
      <Image
        src="/images/hero-bg.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        quality={85}
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-white">Hero Title</h1>
      </div>
    </section>
  );
}
```

---

## Lazy Loading

### Default Lazy Loading

```tsx
// Images are lazy loaded by default (except with priority)
export function ImageGrid({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((src, i) => (
        <div key={i} className="relative aspect-square">
          <Image
            src={src}
            alt={`Image ${i + 1}`}
            fill
            className="object-cover rounded-lg"
            // loading="lazy" is default
          />
        </div>
      ))}
    </div>
  );
}
```

### Priority for Above-the-Fold

```tsx
// Use priority for LCP images
export function HeroImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // Disables lazy loading, preloads image
      fetchPriority="high"
    />
  );
}
```

### Intersection Observer for Complex Cases

```tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';

export function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start loading 100px before in view
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-video">
      {isInView ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}
```

---

## Error Handling

### Fallback Image

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  width: number;
  height: number;
}

export function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  width,
  height,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      src={hasError ? fallbackSrc : imgSrc}
      alt={alt}
      width={width}
      height={height}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}
```

---

## SVG and Icons

### Inline SVG for Icons

```tsx
// For icons, inline SVG is often better than Image
import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

export function Icon({ icon: IconComponent, size = 24, className }: IconProps) {
  return <IconComponent size={size} className={className} aria-hidden="true" />;
}
```

### SVG as Component

```tsx
// components/icons/logo.tsx
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label="Company logo"
      role="img"
    >
      {/* SVG content */}
    </svg>
  );
}
```

---

## Performance Tips

### 1. Use Correct Sizes Attribute

```tsx
// Tell browser what size image will render at
<Image
  src="/product.jpg"
  alt="Product"
  fill
  // Be specific about sizes
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
/>
```

### 2. Prioritize LCP Images

```tsx
// Always use priority for above-the-fold images
<Image src="/hero.jpg" alt="Hero" fill priority />
```

### 3. Use Quality Appropriately

```tsx
// Lower quality for backgrounds (default is 75)
<Image src="/bg.jpg" alt="" fill quality={60} />

// Higher quality for product images
<Image src="/product.jpg" alt="Product" fill quality={90} />
```

### 4. Avoid Layout Shift

```tsx
// Always specify dimensions or use fill with sized container
// Bad - causes layout shift
<Image src="/photo.jpg" alt="Photo" />

// Good - no layout shift
<div className="relative aspect-video">
  <Image src="/photo.jpg" alt="Photo" fill />
</div>
```

---

## External Resources

- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [web.dev Image Optimization](https://web.dev/fast/#optimize-your-images)
