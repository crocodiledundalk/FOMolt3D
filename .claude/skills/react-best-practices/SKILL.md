---
name: react-best-practices
description: Comprehensive React and Next.js performance optimization guide with 40+ rules across 8 categories. Use when writing React components, optimizing bundle size, eliminating waterfalls, or improving rendering performance.
---

> Source: [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) - Based on Vercel Engineering guidelines

# React Best Practices - Performance Optimization Guide

Comprehensive performance optimization guide for React and Next.js applications, designed for AI agents and LLMs. Contains 40+ rules across 8 categories, prioritized by impact.

## When to Use This Skill

Use when:
- Writing or refactoring React/Next.js components
- Optimizing application bundle size
- Eliminating async waterfalls
- Improving server-side rendering performance
- Reducing unnecessary re-renders
- Implementing client-side data fetching patterns

## Core Focus Areas

The guide addresses eight key optimization domains ordered by impact:

| Category | Impact | Focus |
|----------|--------|-------|
| **Eliminating Waterfalls** | CRITICAL | Preventing sequential async operations |
| **Bundle Size Optimization** | CRITICAL | Reducing initial JavaScript payload |
| **Server-Side Performance** | HIGH | Optimizing RSC and data fetching |
| **Client-Side Data Fetching** | MEDIUM-HIGH | Implementing efficient caching |
| **Re-render Optimization** | MEDIUM | Minimizing unnecessary re-renders |
| **Rendering Performance** | MEDIUM | Optimizing browser rendering cycles |
| **JavaScript Performance** | LOW-MEDIUM | Micro-optimizations for hot paths |
| **Advanced Patterns** | LOW | Specialized techniques for edge cases |

## Quick Reference: Critical Rules

### 1. Parallelize Independent Operations

```typescript
// Bad: sequential - 3 round trips
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// Good: parallel - 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

### 2. Avoid Barrel File Imports

```tsx
// Bad: loads entire library (~1MB)
import { Check, X, Menu } from 'lucide-react'

// Good: loads only what you need (~2KB)
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Menu from 'lucide-react/dist/esm/icons/menu'

// Alternative: Next.js 13.5+ config
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/material']
  }
}
```

### 3. Use Strategic Suspense Boundaries

```tsx
// Bad: entire page waits for data
async function Page() {
  const data = await fetchData() // Blocks everything
  return (
    <div>
      <Header />
      <DataDisplay data={data} />
      <Footer />
    </div>
  )
}

// Good: page shell shows immediately
function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  )
}

async function DataDisplay() {
  const data = await fetchData() // Only blocks this component
  return <div>{data.content}</div>
}
```

### 4. Dynamic Imports for Heavy Components

```tsx
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
)
```

### 5. Use SWR for Automatic Deduplication

```tsx
import useSWR from 'swr'

function UserList() {
  // Multiple instances share one request
  const { data: users } = useSWR('/api/users', fetcher)
}
```

## Implementation Strategy

1. **Profile first** - Measure before optimizing
2. **Prioritize by impact** - Start with CRITICAL rules
3. **Measure empirically** - Track TTI, LCP, bundle size
4. **Apply incrementally** - Don't optimize speculatively

## Key Metrics to Track

- **Time to Interactive (TTI)**
- **Largest Contentful Paint (LCP)**
- **Bundle size** (initial and lazy-loaded)
- **Re-render frequency** (React DevTools Profiler)

## Full Reference

See [react-performance-guidelines.md](references/react-performance-guidelines.md) for complete documentation of all 40+ rules with detailed explanations, code comparisons, and impact metrics.

## Related Skills

- [nextjs-frontend](../nextjs-frontend/SKILL.md) - Next.js application development
- [ui-skills](../../general/ui-skills/SKILL.md) - UI development constraints
