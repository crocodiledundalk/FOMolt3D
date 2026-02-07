# Animation

Patterns for implementing animations and transitions in Next.js applications using Tailwind CSS, Framer Motion, and CSS.

## Use When

- Adding micro-interactions to UI elements
- Creating page transitions
- Animating lists and layout changes
- Building complex motion sequences
- Implementing scroll-based animations

---

## Tailwind CSS Animations

### Built-in Animations

```tsx
// Spin - loading spinners
<Loader2 className="h-4 w-4 animate-spin" />

// Ping - notification indicators
<span className="relative flex h-3 w-3">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
</span>

// Pulse - skeleton loading
<div className="animate-pulse bg-muted h-4 w-full rounded" />

// Bounce - attention indicators
<ChevronDown className="h-4 w-4 animate-bounce" />
```

### Custom Tailwind Animations

```ts
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
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
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
};
```

### Transition Utilities

```tsx
// Hover transitions
<Button className="transition-colors hover:bg-primary/90">
  Hover me
</Button>

// Transform transitions
<div className="transition-transform hover:scale-105">
  Scale on hover
</div>

// Multiple properties
<Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
  Lift on hover
</Card>

// Custom duration and timing
<div className="transition-opacity duration-500 ease-in-out">
  Slow fade
</div>
```

---

## CSS Transitions

### Transition Classes

```tsx
// components/shared/fade-transition.tsx
import { cn } from '@/lib/utils';

interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FadeTransition({
  show,
  children,
  className,
}: FadeTransitionProps) {
  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}
```

### Collapse Animation

```tsx
// components/shared/collapse.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapse({ isOpen, children, className }: CollapseProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(
    isOpen ? undefined : 0
  );

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      // After animation, set to auto for dynamic content
      const timer = setTimeout(() => setHeight(undefined), 200);
      return () => clearTimeout(timer);
    } else {
      // Set explicit height before collapsing
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [isOpen]);

  return (
    <div
      ref={contentRef}
      style={{ height }}
      className={cn(
        'overflow-hidden transition-[height] duration-200 ease-out',
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## Framer Motion

### Setup

```bash
npm install framer-motion
```

### Basic Animations

```tsx
// components/shared/animated-container.tsx
'use client';

import { motion } from 'framer-motion';

// Fade in on mount
export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Slide up on mount
export function SlideUp({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// Scale in
export function ScaleIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

### Animation Variants

```tsx
// lib/animations/variants.ts
import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideInFromRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

// Stagger children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};
```

### Staggered List Animation

```tsx
// components/features/users/animated-user-list.tsx
'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations/variants';

interface User {
  id: string;
  name: string;
}

export function AnimatedUserList({ users }: { users: User[] }) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-2"
    >
      {users.map((user) => (
        <motion.li
          key={user.id}
          variants={staggerItem}
          className="p-4 bg-card rounded-lg"
        >
          {user.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### AnimatePresence for Exit Animations

```tsx
// components/shared/animated-modal.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { fadeIn, scaleIn } from '@/lib/animations/variants';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-lg shadow-lg p-6"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Layout Animations

```tsx
// components/features/tasks/task-list.tsx
'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export function TaskList({
  tasks,
  onToggle,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
}) {
  return (
    <LayoutGroup>
      <ul className="space-y-2">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="p-4 bg-card rounded-lg cursor-pointer"
              onClick={() => onToggle(task.id)}
            >
              <span className={task.completed ? 'line-through' : ''}>
                {task.title}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </LayoutGroup>
  );
}
```

---

## Page Transitions

### Page Transition Wrapper

```tsx
// components/layouts/page-transition.tsx
'use client';

import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
```

### Route Transition Provider

```tsx
// providers/route-transition-provider.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Micro-Interactions

### Button Press Effect

```tsx
// components/ui/animated-button.tsx
'use client';

import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';

export function AnimatedButton({ children, ...props }: ButtonProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.1 }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}
```

### Hover Card Effect

```tsx
// components/shared/hover-card.tsx
'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HoverCardProps {
  title: string;
  children: React.ReactNode;
}

export function HoverCard({ title, children }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
    >
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
```

### Icon Animations

```tsx
// components/shared/animated-icon.tsx
'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function AnimatedCheckIcon() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      <Check className="h-5 w-5 text-green-500" />
    </motion.div>
  );
}

// Spinner with fade
export function AnimatedSpinner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: 360 }}
      transition={{
        opacity: { duration: 0.2 },
        rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
      }}
    >
      <Loader2 className="h-5 w-5" />
    </motion.div>
  );
}
```

---

## Scroll Animations

### Scroll-Triggered Animation

```tsx
// components/shared/scroll-reveal.tsx
'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### Parallax Effect

```tsx
// components/shared/parallax.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ParallaxProps {
  children: React.ReactNode;
  offset?: number;
}

export function Parallax({ children, offset = 50 }: ParallaxProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return (
    <motion.div ref={ref} style={{ y }}>
      {children}
    </motion.div>
  );
}
```

---

## Radix UI Animations

### Dialog Animation

```tsx
// components/ui/dialog.tsx (with animations)
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'bg-background p-6 shadow-lg rounded-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
```

---

## Animation Performance

### GPU-Accelerated Properties

```tsx
// Good - GPU accelerated
<div className="transform translate-x-4 scale-105 opacity-50" />

// Avoid - causes layout/paint
<div style={{ left: '100px', width: '200px' }} />
```

### Reduced Motion Support

```tsx
// lib/hooks/use-reduced-motion.ts
'use client';

import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

// Usage
function AnimatedComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ y: 0, opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      Content
    </motion.div>
  );
}
```

### Tailwind Reduced Motion

```tsx
// Respect user preferences
<div className="animate-bounce motion-reduce:animate-none" />

// Or disable all animations
<div className="transition-transform motion-reduce:transition-none" />
```

---

## Best Practices

### 1. Keep Animations Subtle

```tsx
// Good - subtle, purposeful
transition={{ duration: 0.2 }}

// Avoid - too slow, distracting
transition={{ duration: 1 }}
```

### 2. Use Spring for Natural Motion

```tsx
// Natural feeling motion
transition={{
  type: 'spring',
  stiffness: 400,
  damping: 30,
}}
```

### 3. Animate Layout Changes

```tsx
// Use layout animations for smooth reordering
<motion.div layout layoutId={item.id}>
  {item.content}
</motion.div>
```

### 4. Respect User Preferences

```tsx
// Always support prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## External Resources

- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind Animation](https://tailwindcss.com/docs/animation)
- [Web Animations Performance](https://web.dev/animations-guide/)
- [Radix UI Animation](https://www.radix-ui.com/primitives/docs/utilities/animate)
