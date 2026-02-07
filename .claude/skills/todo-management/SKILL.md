---
name: todo-management
description: "Dynamic TODO tracking with task discovery, decomposition, and priority management. Keeps work organized and surfaces hidden tasks."
---

# TODO Management Skill

This skill maintains dynamic TODO lists that evolve as work progresses, capturing discovered tasks and managing priorities.

## Core Principles

1. **TODOs are living documents** - Update constantly
2. **Discovery is normal** - New tasks emerge during work
3. **Decomposition matters** - Big tasks become small tasks
4. **Nothing is forgotten** - Every identified task gets tracked
5. **Completion is celebrated** - Clear sense of progress

## TODO Lifecycle

### Task States

```
PENDING     → IN_PROGRESS → COMPLETED
    ↓             ↓
  BLOCKED     DEFERRED
    ↓             ↓
UNBLOCKED   REACTIVATED
```

| State | Meaning | Action |
|-------|---------|--------|
| `pending` | Ready to start | Pick up when ready |
| `in_progress` | Currently working | Focus on this |
| `completed` | Done and verified | Celebrate! |
| `blocked` | Waiting on external | Document blocker |
| `deferred` | Intentionally delayed | Note reason |

### Priority Levels

```
P0 - Critical   : Must do NOW, blocks everything
P1 - High       : Must do this session
P2 - Medium     : Should do soon
P3 - Low        : Nice to have
P4 - Someday    : When everything else is done
```

## TODO Format

### Standard TODO Entry

```markdown
- [ ] [P1] Task title
  - Context: [Why this matters]
  - Acceptance: [How we know it's done]
  - Dependencies: [What must happen first]
  - Discovered: [When/how this was identified]
```

### Example

```markdown
- [ ] [P1] Add input validation to login form
  - Context: Currently accepts any input, security risk
  - Acceptance: Email format validated, password min 8 chars, error messages shown
  - Dependencies: None
  - Discovered: During security review

- [ ] [P2] Refactor UserService to use dependency injection
  - Context: Hard to test, tightly coupled
  - Acceptance: Service accepts dependencies via constructor, tests use mocks
  - Dependencies: Understand current test patterns first
  - Discovered: While writing unit tests
```

## Dynamic TODO Management

### Task Discovery

When you discover a new task while working:

```markdown
## Task Discovery Log

### During: [Current task]
### Discovered: [Timestamp]

**New Task:** [Description]
**Why Now:** [Why this came up]
**Priority Assessment:**
- Blocks current work? [Yes/No]
- Security/stability risk? [Yes/No]
- Quick win (<5 min)? [Yes/No]

**Decision:**
[ ] Do immediately (quick win or blocker)
[ ] Add to TODO as P1 (urgent)
[ ] Add to TODO as P2 (soon)
[ ] Add to TODO as P3 (later)
[ ] Note for future PR (out of scope)
```

### Task Decomposition

When a task is too large:

```markdown
## Task Decomposition

### Original Task: [Large task description]
### Why Decomposing: [Too big / unclear / needs phases]

### Subtasks:

#### Phase 1: [Preparation]
- [ ] [P1] Subtask 1.1
- [ ] [P1] Subtask 1.2

#### Phase 2: [Implementation]
- [ ] [P1] Subtask 2.1
- [ ] [P1] Subtask 2.2
- [ ] [P2] Subtask 2.3

#### Phase 3: [Verification]
- [ ] [P1] Subtask 3.1
- [ ] [P2] Subtask 3.2

### Completion Criteria:
All subtasks completed = Original task completed
```

### Handling Blockers

When a task becomes blocked:

```markdown
## Blocker Report

### Task: [Blocked task]
### Blocker: [What's blocking]
### Type:
[ ] External dependency (waiting on someone/something)
[ ] Technical blocker (need to solve X first)
[ ] Information gap (need to understand Y)
[ ] Resource blocker (need access to Z)

### Unblocking Strategy:
1. [Action to take]
2. [Fallback if action doesn't work]

### Timeout: [When to escalate if still blocked]
```

## TODO List Structure

### Recommended Format

```markdown
# TODO - [Project/Feature Name]

## Currently In Progress
- [x] Completed task (keep briefly for context)
- [ ] **[P0] IN PROGRESS: Current focus task**
  - Progress: [What's done so far]
  - Next: [Immediate next step]

## Ready to Start (Prioritized)
- [ ] [P1] Next high-priority task
- [ ] [P1] Another high-priority task
- [ ] [P2] Medium priority task

## Blocked
- [ ] [P1] BLOCKED: Task waiting on X
  - Blocker: [Description]
  - Owner: [Who can unblock]

## Discovered This Session
- [ ] [P2] New task found during work
- [ ] [P3] Nice-to-have noticed during review

## Deferred (Out of Scope)
- [ ] [P4] Task for future PR
- [ ] [P4] Optimization to consider later

---
Last Updated: [Timestamp]
```

## Session Management

### Session Start

```markdown
## Session Start - [Timestamp]

### Continuing From:
- [Previous session summary]

### Today's Focus:
1. [Primary goal]
2. [Secondary goal if time]

### Carrying Over:
- [ ] [Task from previous session]
- [ ] [Task from previous session]

### New This Session:
- [ ] [New task if any]
```

### Session End

```markdown
## Session End - [Timestamp]

### Completed:
- [x] [Task 1]
- [x] [Task 2]

### In Progress (Handoff Notes):
- [ ] [Task 3]
  - State: [Where I stopped]
  - Next: [What to do next]

### Discovered (Not Started):
- [ ] [New task 1]
- [ ] [New task 2]

### Blocked (Needs Attention):
- [ ] [Blocked task]

### Recommendations for Next Session:
1. [Suggestion]
2. [Suggestion]
```

## Integration with Other Skills

### With success-criteria
- Each TODO should map to success criterion
- Completion = criterion satisfied

### With ralph-validation
- Run validation before marking complete
- Incomplete validation = task not done

### With git-workflow
- Group related TODOs for atomic commits
- Complete TODO group → commit

### With context-management
- Update TODOs before `/clear`
- TODOs survive context reset

### With gap-learning
- Gaps become TODO items
- "Learn about X" is valid TODO

## Best Practices

### Do

- Update TODOs in real-time
- Break large tasks immediately
- Note why tasks are blocked
- Celebrate completions
- Review list at session start/end
- Prioritize ruthlessly

### Don't

- Let TODOs grow unbounded (>20 active)
- Keep completed tasks forever
- Have multiple P0s simultaneously
- Skip decomposition for big tasks
- Ignore discovered tasks
- Mark done without verification

## TODO Hygiene

### Weekly Review Checklist

```markdown
## TODO Weekly Review - [Date]

### Cleanup Actions:
- [ ] Archive completed tasks older than 1 week
- [ ] Re-prioritize based on current goals
- [ ] Remove obsolete tasks
- [ ] Decompose any task sitting >3 days
- [ ] Follow up on blocked items

### Metrics:
- Tasks completed this week: [N]
- Tasks added this week: [N]
- Currently blocked: [N]
- Oldest pending task: [Age]
```
