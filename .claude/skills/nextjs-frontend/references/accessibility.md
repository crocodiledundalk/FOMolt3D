# Accessibility

Patterns and best practices for building accessible Next.js applications that work for all users.

## Use When

- Building any user interface
- Implementing keyboard navigation
- Creating forms and interactive elements
- Managing focus and screen reader announcements
- Testing for accessibility compliance

---

## Semantic HTML

### Use Correct Elements

```tsx
// Good - semantic elements
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/home">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="intro-heading">
      <h2 id="intro-heading">Introduction</h2>
      <p>Content...</p>
    </section>
  </article>
</main>

<aside aria-label="Related content">
  <h2>Related Articles</h2>
</aside>

<footer>
  <nav aria-label="Footer navigation">...</nav>
</footer>

// Avoid - div soup
<div class="header">
  <div class="nav">
    <div class="nav-item">Home</div>
  </div>
</div>
```

### Heading Hierarchy

```tsx
// Good - proper heading hierarchy
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

// Avoid - skipping levels or using headings for styling
<h1>Title</h1>
<h4>Should be h2</h4> // Skipped h2 and h3
```

### Lists for Navigation

```tsx
// Good - navigation as list
<nav aria-label="Main">
  <ul role="list">
    <li><Link href="/">Home</Link></li>
    <li><Link href="/about">About</Link></li>
    <li><Link href="/contact">Contact</Link></li>
  </ul>
</nav>

// Announce current page
<li>
  <Link href="/about" aria-current="page">About</Link>
</li>
```

---

## Interactive Elements

### Button Accessibility

```tsx
// components/ui/button.tsx
import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, isLoading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && <Spinner className="mr-2" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
```

### Icon Buttons

```tsx
// Always provide accessible names for icon-only buttons
<Button variant="ghost" size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" aria-hidden="true" />
</Button>

// Or use visually hidden text
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" aria-hidden="true" />
  <span className="sr-only">Close dialog</span>
</Button>
```

### Links vs Buttons

```tsx
// Use links for navigation
<Link href="/settings">Settings</Link>

// Use buttons for actions
<button onClick={handleSave}>Save</button>

// If link looks like button, still use Link
<Link href="/signup" className="btn btn-primary">
  Sign Up
</Link>

// Never use div/span for interactive elements
// Bad
<div onClick={handleClick} role="button" tabIndex={0}>
  Click me
</div>
```

---

## Form Accessibility

### Label Association

```tsx
// Good - explicit label association
<div className="space-y-2">
  <Label htmlFor="email">Email address</Label>
  <Input
    id="email"
    type="email"
    aria-describedby="email-description email-error"
  />
  <p id="email-description" className="text-sm text-muted-foreground">
    We'll never share your email.
  </p>
  {error && (
    <p id="email-error" className="text-sm text-destructive" role="alert">
      {error}
    </p>
  )}
</div>
```

### Required Fields

```tsx
// Indicate required fields
<Label htmlFor="name">
  Name <span aria-hidden="true" className="text-destructive">*</span>
  <span className="sr-only">(required)</span>
</Label>
<Input
  id="name"
  required
  aria-required="true"
/>
```

### Form Errors

```tsx
// components/forms/form-field.tsx
interface FormFieldProps {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
}

export function FormField({ name, label, error, required }: FormFieldProps) {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Input
        id={inputId}
        name={name}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
```

### Form Validation

```tsx
// Announce errors to screen readers
function Form() {
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Error summary for screen readers */}
      {errors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 p-4 rounded-md mb-4"
        >
          <h2 className="font-semibold">
            Please fix {errors.length} error(s):
          </h2>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form fields */}
    </form>
  );
}
```

---

## Focus Management

### Focus Visible Styles

```css
/* globals.css */
/* Ensure focus is visible */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Remove default outline but keep focus-visible */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Skip Link

```tsx
// components/shared/skip-link.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}

// In layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SkipLink />
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

### Focus Trap for Modals

```tsx
// components/ui/dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';

// Radix handles focus trap automatically
export function Dialog({ children, open, onOpenChange }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay />
        <DialogPrimitive.Content
          // Focus first focusable element on open
          // Return focus to trigger on close
          // Trap focus within dialog
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

### Focus on Route Change

```tsx
// Focus main content after navigation
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function FocusOnRouteChange() {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Focus main content after route change
    mainRef.current?.focus();
  }, [pathname]);

  return null;
}

// Or announce route changes
export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Get page title
    const title = document.title;
    setAnnouncement(`Navigated to ${title}`);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

---

## Keyboard Navigation

### Keyboard Support for Custom Components

```tsx
// components/shared/tabs.tsx
'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface TabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
}

export function Tabs({ tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        newIndex = index === 0 ? tabs.length - 1 : index - 1;
        break;
      case 'ArrowRight':
        newIndex = index === tabs.length - 1 ? 0 : index + 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveTab(newIndex);
    tabRefs.current[newIndex]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Tabs" className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === index}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'px-4 py-2',
              activeTab === index && 'border-b-2 border-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== index}
          tabIndex={0}
          className="p-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

## Screen Reader Support

### Live Regions

```tsx
// Announce dynamic content changes
export function StatusMessage({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// For errors/urgent messages
export function ErrorAnnouncement({ error }: { error: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {error}
    </div>
  );
}
```

### Loading States

```tsx
// Announce loading state
function DataList() {
  const { data, isLoading } = useQuery({ queryKey: ['data'] });

  return (
    <div aria-busy={isLoading} aria-live="polite">
      {isLoading && (
        <>
          <Spinner aria-hidden="true" />
          <span className="sr-only">Loading data...</span>
        </>
      )}

      {!isLoading && (
        <ul>
          {data?.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Visually Hidden Content

```tsx
// styles/globals.css or component
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

// Usage
<span className="sr-only">Opens in new tab</span>
```

---

## Color and Contrast

### Color Contrast Requirements

```tsx
// WCAG 2.1 AA requirements:
// - Normal text: 4.5:1 contrast ratio
// - Large text (18px+ or 14px+ bold): 3:1 ratio
// - UI components: 3:1 ratio

// Tailwind defaults meet these requirements
// When customizing, verify contrast:
// https://webaim.org/resources/contrastchecker/
```

### Don't Rely on Color Alone

```tsx
// Good - icon + text + color
<Badge variant="success">
  <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
  Approved
</Badge>

// Bad - color only
<span className="text-green-500">Approved</span>
```

---

## Images and Media

### Image Alt Text

```tsx
import Image from 'next/image';

// Informative image
<Image
  src="/chart.png"
  alt="Sales increased 25% from January to March 2024"
  width={600}
  height={400}
/>

// Decorative image
<Image
  src="/decorative-pattern.png"
  alt=""
  role="presentation"
  width={100}
  height={100}
/>

// Complex image with long description
<figure>
  <Image
    src="/complex-diagram.png"
    alt="Network architecture diagram"
    aria-describedby="diagram-description"
    width={800}
    height={600}
  />
  <figcaption id="diagram-description">
    Detailed description of the network architecture...
  </figcaption>
</figure>
```

### Video Accessibility

```tsx
// Video with captions and controls
<video
  controls
  aria-label="Product demo video"
>
  <source src="/video.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="/captions.vtt"
    srcLang="en"
    label="English"
    default
  />
  <track
    kind="descriptions"
    src="/descriptions.vtt"
    srcLang="en"
    label="English Audio Descriptions"
  />
  Your browser does not support video.
</video>
```

---

## Testing Accessibility

### Automated Testing

```tsx
// Using jest-axe for automated tests
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist

```markdown
## Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus order is logical
- [ ] Focus is visible
- [ ] Can operate all controls with keyboard
- [ ] Can escape from modals/dropdowns

## Screen Reader
- [ ] Page has proper heading structure
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Dynamic content is announced
- [ ] Link text is descriptive

## Visual
- [ ] Color contrast meets WCAG AA
- [ ] Text can be resized to 200%
- [ ] Content is readable without CSS
- [ ] Focus indicators are visible
```

---

## Best Practices

### 1. Start with Semantic HTML

```tsx
// Good foundation for accessibility
<button>, <a>, <input>, <label>, <nav>, <main>, <header>
```

### 2. Use ARIA Sparingly

```tsx
// Only use ARIA when native HTML can't express the semantics
// First rule of ARIA: Don't use ARIA if you can use HTML
```

### 3. Test with Real Users

```tsx
// Automated tests catch ~30% of issues
// Always test with screen readers and keyboard
```

### 4. Provide Text Alternatives

```tsx
// All non-text content needs text alternatives
// Images, icons, charts, media
```

### 5. Support Zoom and Text Resize

```tsx
// Use relative units (rem, em)
// Test at 200% zoom
// Don't disable zoom on mobile
```

---

## External Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Inclusive Components](https://inclusive-components.design/)
