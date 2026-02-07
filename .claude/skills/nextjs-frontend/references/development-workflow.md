# Development Workflow

Framework for delegating frontend development tasks to agents, ensuring consistency when multiple agents work in parallel.

## Use When

- Planning feature implementation with multiple agents
- Delegating UI/component tasks
- Ensuring consistent patterns across parallel work
- Reviewing agent-generated code
- Orchestrating complex feature development

---

## Manager Role Overview

As a manager agent, your responsibilities are:

1. **Decompose features** into discrete, parallelizable tasks
2. **Assign tasks** with clear specifications and constraints
3. **Ensure consistency** by referencing established patterns
4. **Review and integrate** completed work
5. **Handle conflicts** when parallel work overlaps

---

## Task Decomposition

### Feature Breakdown Pattern

When given a feature request, decompose into:

```
Feature: User Profile Page
├── Data Layer
│   ├── API types (types/entities/user.ts)
│   ├── API service (lib/api/services/users.ts)
│   └── React Query hooks (hooks/queries/use-user.ts)
├── UI Components
│   ├── ProfileHeader (components/features/profile/profile-header.tsx)
│   ├── ProfileStats (components/features/profile/profile-stats.tsx)
│   └── ProfileTabs (components/features/profile/profile-tabs.tsx)
├── Page Integration
│   └── app/profile/[id]/page.tsx
└── Tests
    ├── Component tests
    └── Integration tests
```

### Task Independence Rules

Tasks can run in parallel if they:
- Don't modify the same files
- Don't depend on each other's output
- Have clear interface contracts defined upfront

Tasks must be sequential if:
- One produces types/interfaces another consumes
- One creates a component another composes
- Database/API schema changes affect multiple areas

---

## Task Specification Template

### For Component Tasks

```markdown
## Task: Create [ComponentName]

### Location
`components/features/[feature]/[component-name].tsx`

### Purpose
[One sentence describing what this component does]

### Props Interface
```typescript
interface [ComponentName]Props {
  // Define exact props with types
}
```

### Behavior
- [Behavior 1]
- [Behavior 2]

### Patterns to Follow
- Reference: [relevant reference file]
- Use shadcn/ui [specific components]
- Follow [specific pattern from codebase]

### Example Usage
```tsx
<ComponentName prop1={value} prop2={value} />
```

### Acceptance Criteria
- [ ] Renders correctly with all prop combinations
- [ ] Handles loading/error states (if applicable)
- [ ] Accessible (keyboard nav, screen reader)
- [ ] Responsive across breakpoints
- [ ] Matches design system tokens
```

### For Hook Tasks

```markdown
## Task: Create [useHookName]

### Location
`hooks/[use-hook-name].ts`

### Purpose
[What this hook provides]

### Interface
```typescript
function useHookName(params: ParamsType): ReturnType
```

### Implementation Notes
- Use [specific patterns]
- Handle [specific edge cases]

### Patterns to Follow
- Reference: state-management.md, data-fetching.md

### Usage Example
```tsx
const { data, isLoading } = useHookName(params);
```
```

### For Page Tasks

```markdown
## Task: Create [PageName] Page

### Location
`app/[route]/page.tsx`

### Data Requirements
- Fetch: [what data]
- From: [which service/hook]

### Layout
- Use: [specific layout pattern]
- Sections: [list major sections]

### Components to Use
- [Component1] from [location]
- [Component2] from [location]

### Patterns to Follow
- Server Component for data fetching
- Reference: server-components.md
- Loading state: loading.tsx
- Error handling: error.tsx

### SEO
- Title: [template]
- Description: [template]
```

---

## Consistency Enforcement

### Pre-Task Checklist

Before assigning any task, verify:

```markdown
1. [ ] Types defined in `types/` directory
2. [ ] API service exists or spec provided
3. [ ] Design tokens documented
4. [ ] Similar patterns exist to reference
5. [ ] Component location follows project structure
```

### Pattern References by Task Type

| Task Type | Primary References |
|-----------|-------------------|
| New Component | component-patterns.md, design-system.md |
| Form | forms.md, type-safety.md |
| Data Display | tables.md, loading-states.md |
| Navigation | navigation.md |
| Modal/Dialog | modals-dialogs.md |
| Data Fetching | data-fetching.md, api-layer.md |
| State Management | state-management.md |
| Server Component | server-components.md |
| Styling | design-system.md, theming.md |
| Animation | animation.md |

### Code Style Constraints

Always include in task specs:

```markdown
### Code Standards
- Use TypeScript strict mode
- Follow existing naming conventions
- Use `cn()` for conditional classes
- Import from `@/` aliases
- No inline styles (use Tailwind)
- No `any` types
- Destructure props in function signature
- Use named exports (not default)
```

---

## Parallel Work Coordination

### Interface-First Development

When tasks will integrate, define interfaces first:

```typescript
// Define shared contract before parallel work begins
// types/features/dashboard.ts

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
}

export interface DashboardWidgetProps {
  title: string;
  value: number | string;
  trend?: { value: number; direction: 'up' | 'down' };
}
```

Then assign parallel tasks:
- Agent A: Create StatsCard component using DashboardWidgetProps
- Agent B: Create useDashboardStats hook returning DashboardStats
- Agent C: Create Dashboard page composing both

### Avoiding Conflicts

```markdown
## Conflict Prevention Rules

1. **One agent per file** - Never assign same file to multiple agents
2. **Shared types first** - Define shared interfaces before component work
3. **Clear boundaries** - Each agent owns a specific directory/feature
4. **No implicit dependencies** - All dependencies must be explicit in task
```

### Integration Points

Define clear integration contracts:

```markdown
## Integration Contract: UserProfile Feature

### Data Flow
1. `usersService.getById(id)` returns `User`
2. `useUser(id)` hook wraps service with React Query
3. `ProfilePage` uses hook, passes data to components
4. Components receive typed props, no fetching

### File Ownership
- Agent A: types/, lib/api/services/users.ts
- Agent B: hooks/queries/use-user.ts
- Agent C: components/features/profile/*
- Agent D: app/profile/[id]/page.tsx

### Integration Order
1. Types (Agent A) → complete first
2. Service + Hook (A, B) → parallel after types
3. Components (C) → after types
4. Page (D) → after all above
```

---

## Review Guidelines

### Component Review Checklist

```markdown
## Code Review: [ComponentName]

### Structure
- [ ] File in correct location
- [ ] Named export used
- [ ] Props interface defined and exported
- [ ] TypeScript strict (no any, proper types)

### Patterns
- [ ] Uses design system tokens
- [ ] Follows component-patterns.md
- [ ] Uses cn() for class merging
- [ ] Proper use of shadcn/ui primitives

### Quality
- [ ] No unused imports/variables
- [ ] No console.logs
- [ ] Proper error handling
- [ ] Loading states handled
- [ ] Accessibility attributes present

### Integration
- [ ] Imports use @/ aliases
- [ ] Compatible with defined interfaces
- [ ] No circular dependencies
```

### Common Issues to Flag

```markdown
## Red Flags in Review

1. **Hardcoded values** → Should use config or constants
2. **Inline fetch calls** → Should use API service layer
3. **Local state for server data** → Should use React Query
4. **Custom styling** → Should use design tokens
5. **Missing types** → All props/returns must be typed
6. **Direct DOM manipulation** → Should use React patterns
7. **Missing loading/error states** → Required for async operations
8. **No accessibility** → Must have proper ARIA, focus management
```

---

## Communication Templates

### Task Assignment

```markdown
## Task Assignment: [Task Name]

**Assigned to:** Agent [X]
**Priority:** [High/Medium/Low]
**Blocked by:** [None / Task Y]
**Blocks:** [None / Task Z]

### Objective
[Clear, single-sentence objective]

### Deliverables
1. [File 1 with path]
2. [File 2 with path]

### Specifications
[Detailed specs following templates above]

### References
- [Reference 1]
- [Reference 2]

### Definition of Done
- [ ] All files created
- [ ] Types correct
- [ ] Passes review checklist
- [ ] No TypeScript errors
```

### Status Updates

```markdown
## Status: [Task Name]

**Status:** [Not Started / In Progress / Review / Complete / Blocked]
**Agent:** [X]
**Updated:** [timestamp]

### Progress
- [x] Completed item
- [ ] Pending item

### Blockers
[None / Description of blocker]

### Notes
[Any relevant information]
```

### Integration Request

```markdown
## Integration Request: [Feature Name]

**Components Ready:**
- [x] Component A (Agent X)
- [x] Component B (Agent Y)
- [ ] Component C (Agent Z) - ETA: [time]

### Integration Steps
1. [Step 1]
2. [Step 2]

### Testing Required
- [ ] Components render together
- [ ] Data flows correctly
- [ ] No type errors
- [ ] Visual review
```

---

## Example: Full Feature Workflow

### Feature: Product Catalog Page

#### Phase 1: Planning & Types

```markdown
## Phase 1: Foundation

### Task 1.1: Define Types
Agent: A
Files:
- types/entities/product.ts
- types/api/products.ts

Deliverables:
- Product, ProductVariant, ProductCategory interfaces
- CreateProductDTO, UpdateProductDTO types
- ProductsResponse, ProductResponse types
```

#### Phase 2: Data Layer (Parallel)

```markdown
## Phase 2: Data Layer

### Task 2.1: API Service
Agent: A
Files: lib/api/services/products.ts
Dependencies: Task 1.1
Reference: api-layer.md

### Task 2.2: Query Hooks
Agent: B
Files: hooks/queries/use-products.ts
Dependencies: Task 1.1, 2.1
Reference: data-fetching.md
```

#### Phase 3: Components (Parallel)

```markdown
## Phase 3: UI Components

### Task 3.1: ProductCard
Agent: C
Files: components/features/products/product-card.tsx
Dependencies: Task 1.1
Reference: component-patterns.md

### Task 3.2: ProductGrid
Agent: D
Files: components/features/products/product-grid.tsx
Dependencies: Task 1.1
Reference: component-patterns.md

### Task 3.3: ProductFilters
Agent: E
Files: components/features/products/product-filters.tsx
Dependencies: Task 1.1
Reference: forms.md
```

#### Phase 4: Integration

```markdown
## Phase 4: Page Integration

### Task 4.1: Products Page
Agent: F
Files:
- app/products/page.tsx
- app/products/loading.tsx
- app/products/error.tsx
Dependencies: All Phase 2 & 3 tasks
Reference: server-components.md, seo-metadata.md
```

#### Phase 5: Review & Polish

```markdown
## Phase 5: Final Review

### Task 5.1: Integration Testing
- Verify all components integrate
- Test data flow end-to-end
- Check responsive behavior

### Task 5.2: Accessibility Audit
- Keyboard navigation
- Screen reader testing
- Color contrast

### Task 5.3: Performance Check
- Lighthouse scores
- Bundle size impact
- Loading performance
```

---

## Quick Reference

### Task Assignment Checklist

```markdown
Before assigning any task:
[ ] Clear objective (one sentence)
[ ] File paths specified
[ ] Interface/types defined or referenced
[ ] Relevant pattern references listed
[ ] Dependencies identified
[ ] Acceptance criteria defined
[ ] No overlap with other active tasks
```

### Common Parallel Patterns

| Safe to Parallel | Must Be Sequential |
|-----------------|-------------------|
| Independent components | Type → Consumer |
| Unrelated hooks | API service → Hook |
| Different pages | Base component → Composite |
| Test files | Schema → Implementation |

### Emergency Fixes

When conflicts arise:
1. **Stop affected tasks** immediately
2. **Identify conflict** (same file, incompatible types, etc.)
3. **Resolve at interface level** first
4. **Reassign with clear boundaries**
5. **Resume with explicit dependencies**

---

## External Resources

- [Project Structure](./project-structure.md)
- [Component Patterns](./component-patterns.md)
- [Type Safety](./type-safety.md)
- [All Reference Files](../SKILL.md)
