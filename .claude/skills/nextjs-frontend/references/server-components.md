# Server Components

Patterns for using React Server Components (RSC) effectively in Next.js applications.

## Use When

- Fetching data on the server
- Rendering static or dynamic content
- Reducing client-side JavaScript
- Accessing server-only resources
- Implementing streaming and suspense

---

## Server vs Client Components

### Decision Guide

| Use Server Components | Use Client Components |
|----------------------|----------------------|
| Data fetching | Event handlers (onClick, onChange) |
| Access backend resources | useState, useEffect |
| Access sensitive data (API keys) | Browser APIs |
| Heavy dependencies | Interactivity |
| Render-only content | Custom hooks with state |

### Default to Server Components

```tsx
// app/users/page.tsx
// Server Component by default - no 'use client'

async function getUsers() {
  const res = await fetch('https://api.example.com/users');
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Mark Client Components Explicitly

```tsx
// components/features/counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

---

## Data Fetching Patterns

### Direct Data Fetching

```tsx
// app/posts/page.tsx
// Fetch data directly in Server Components

async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }

  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### Parallel Data Fetching

```tsx
// app/dashboard/page.tsx
// Fetch multiple data sources in parallel

async function getStats() {
  const res = await fetch('/api/stats');
  return res.json();
}

async function getRecentUsers() {
  const res = await fetch('/api/users/recent');
  return res.json();
}

async function getRecentOrders() {
  const res = await fetch('/api/orders/recent');
  return res.json();
}

export default async function DashboardPage() {
  // Parallel fetching - much faster!
  const [stats, users, orders] = await Promise.all([
    getStats(),
    getRecentUsers(),
    getRecentOrders(),
  ]);

  return (
    <div>
      <StatsCards stats={stats} />
      <RecentUsers users={users} />
      <RecentOrders orders={orders} />
    </div>
  );
}
```

### Sequential Data Fetching (When Needed)

```tsx
// app/users/[id]/page.tsx
// Sometimes data depends on previous fetch

async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

async function getUserPosts(userId: string) {
  const res = await fetch(`/api/users/${userId}/posts`);
  return res.json();
}

export default async function UserPage({ params }: { params: { id: string } }) {
  // Sequential - posts depend on user
  const user = await getUser(params.id);
  const posts = await getUserPosts(user.id);

  return (
    <div>
      <UserProfile user={user} />
      <UserPosts posts={posts} />
    </div>
  );
}
```

---

## Streaming with Suspense

### Component-Level Streaming

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

// Slower component
async function SlowAnalytics() {
  const data = await fetchAnalytics(); // Takes 3 seconds
  return <AnalyticsChart data={data} />;
}

// Fast component
async function QuickStats() {
  const stats = await fetchStats(); // Takes 100ms
  return <StatsDisplay stats={stats} />;
}

export default function DashboardPage() {
  return (
    <div>
      {/* Quick content renders immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />
      </Suspense>

      {/* Slow content streams in when ready */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <SlowAnalytics />
      </Suspense>
    </div>
  );
}
```

### Nested Suspense

```tsx
// Stream content progressively
export default function ProductPage({ params }) {
  return (
    <div>
      {/* Product info - fastest */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={params.id} />
      </Suspense>

      {/* Reviews - medium */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews id={params.id} />
      </Suspense>

      {/* Recommendations - slowest */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations id={params.id} />
      </Suspense>
    </div>
  );
}
```

---

## Composition Patterns

### Server Component with Client Islands

```tsx
// app/posts/[id]/page.tsx
// Server Component (parent)

import { LikeButton } from '@/components/like-button'; // Client
import { CommentSection } from '@/components/comment-section'; // Client

export default async function PostPage({ params }) {
  const post = await getPost(params.id);

  return (
    <article>
      {/* Static content - rendered on server */}
      <h1>{post.title}</h1>
      <p className="text-muted-foreground">{post.author.name}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      {/* Interactive islands - hydrated on client */}
      <LikeButton postId={post.id} initialLikes={post.likes} />
      <CommentSection postId={post.id} />
    </article>
  );
}
```

### Passing Server Data to Client Components

```tsx
// app/users/page.tsx
import { UserSearch } from '@/components/user-search';

export default async function UsersPage() {
  const users = await getUsers();

  // Pass serializable data to client component
  return (
    <div>
      <h1>Users</h1>
      {/* users must be serializable (no functions, dates as strings) */}
      <UserSearch initialUsers={users} />
    </div>
  );
}
```

```tsx
// components/user-search.tsx
'use client';

import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserSearch({ initialUsers }: { initialUsers: User[] }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(initialUsers);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      <ul>
        {filteredUsers.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Children Pattern

```tsx
// components/providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system">
      {children}
    </NextThemesProvider>
  );
}
```

```tsx
// app/layout.tsx
// Server Component wrapping Client Component

import { ThemeProvider } from '@/components/providers/theme-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Client provider wrapping server content */}
        <ThemeProvider>
          {children} {/* children can be Server Components */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Caching Strategies

### Fetch Caching

```tsx
// Default caching (cached indefinitely)
const data = await fetch('https://api.example.com/data');

// Revalidate after time
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }, // 1 hour
});

// No caching
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store',
});

// Cache with tags for on-demand revalidation
const data = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] },
});
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { tag, path, secret } = await request.json();

  // Verify secret
  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  if (tag) {
    revalidateTag(tag);
  }

  if (path) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: true });
}
```

---

## Server Actions

### Basic Server Action

```tsx
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.post.create({
    data: { title, content },
  });

  revalidatePath('/posts');
}
```

### Using in Components

```tsx
// app/posts/new/page.tsx
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### With Client Component

```tsx
// components/forms/post-form.tsx
'use client';

import { createPost } from '@/app/actions';
import { useFormState, useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create'}
    </button>
  );
}

export function PostForm() {
  const [state, formAction] = useFormState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />
      <SubmitButton />
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

---

## Best Practices

### 1. Keep Server Components Data-Focused

```tsx
// Good - data fetching in Server Component
async function UserList() {
  const users = await getUsers();
  return <UserGrid users={users} />;
}

// Avoid - unnecessary client component for data display
'use client';
function UserList() {
  const { data } = useQuery({ queryKey: ['users'] });
  return <UserGrid users={data} />;
}
```

### 2. Minimize Client Component Boundaries

```tsx
// Good - small client island
function Page() {
  return (
    <div>
      <StaticContent />
      <InteractiveWidget /> {/* Only this needs 'use client' */}
      <MoreStaticContent />
    </div>
  );
}

// Avoid - entire page as client component
'use client';
function Page() {
  // Everything is now client-side
}
```

### 3. Use Loading States

```tsx
// Always provide loading UI
export default function Loading() {
  return <PageSkeleton />;
}

// Or use Suspense
<Suspense fallback={<Skeleton />}>
  <AsyncComponent />
</Suspense>
```

### 4. Handle Errors

```tsx
// app/posts/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## External Resources

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Patterns for Server Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
