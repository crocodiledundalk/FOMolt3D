---
name: context-management
description: "Strategic context window management with compaction, clearing, and delegation. Prevents context overflow and maintains focus on current task."
---

# Context Management Skill

This skill ensures efficient use of the context window through strategic compaction, clearing, and delegation to subagents.

## Why Context Management Matters

- Claude's context window is finite (200K standard, up to 1M beta)
- Performance degrades in the final 20% of context
- Lost context = lost understanding of your codebase
- Strategic management extends effective working time

## Context Health Indicators

### Warning Signs (Take Action)

| Indicator | Meaning | Action |
|-----------|---------|--------|
| Many tool calls in history | Context filling up | Consider `/compact` |
| Repeated file reads | Context may be confused | Use `/clear` + targeted reload |
| Claude asks already-answered questions | Information lost | Summarize key context |
| Response quality declining | Context pressure | Delegate to subagent |
| Complex multi-file operation | Heavy context load | Break into phases |

### Healthy Context Practices

- Start sessions with clear objectives
- Delegate exploration to subagents
- Summarize findings before continuing
- Clear context at natural breakpoints
- Keep CLAUDE.md concise (<200 lines)

## Strategic Context Commands

### `/compact` - Summarize and Continue

Use when:
- Working on a long task
- Many intermediate steps completed
- Need to continue but context is heavy
- Want to preserve key decisions

```markdown
## Before /compact, ensure:
- [ ] Current task state is clear
- [ ] Important decisions are documented
- [ ] No pending questions need answers
- [ ] Next steps are identified
```

### `/clear` - Fresh Start

Use when:
- Switching to unrelated task
- Context is confused or contradictory
- Starting new feature/PR
- After completing a major milestone

```markdown
## After /clear, reload:
1. CLAUDE.md (automatic)
2. Specific files needed for new task
3. Any relevant context from previous session
```

### Subagent Delegation

Delegate to subagents when:
- Exploring unfamiliar codebase areas
- Running multiple parallel investigations
- Task produces verbose output not needed in main context
- Work is self-contained and can return summary

```markdown
## Delegation Decision Matrix

| Task Type | Main Context | Subagent |
|-----------|--------------|----------|
| Code you're actively editing | ✓ | |
| Exploration/research | | ✓ |
| Running tests | ✓ | |
| Analyzing test output | | ✓ |
| Writing new code | ✓ | |
| Reviewing existing code | | ✓ |
| Multi-file refactor | ✓ | ✓ (parallel) |
```

## Context Preservation Strategies

### Document Key Decisions

Before clearing or compacting, explicitly document:

```markdown
## Context Snapshot - [Timestamp]

### Current Task
[What we're working on]

### Key Decisions Made
1. [Decision 1]: [Rationale]
2. [Decision 2]: [Rationale]

### Files Modified
- `path/to/file1.ts` - [What was changed]
- `path/to/file2.ts` - [What was changed]

### Open Questions
- [Question 1]
- [Question 2]

### Next Steps
1. [Next step 1]
2. [Next step 2]

### Relevant Context to Reload
- [File or information to re-read after clear]
```

### Use Memory Commands

The `#` prefix saves to CLAUDE.md memory:

```markdown
# [Important note to remember]

Examples:
# "This project uses pnpm, not npm"
# "Database migrations require manual approval"
# "Never modify files in /legacy - they're deprecated but required"
```

## Subagent Orchestration for Context Management

### Parallel Exploration Pattern

```markdown
## Task: Understand how [feature] works across codebase

### Subagent 1: Backend Investigation
Explore: src/api/, src/services/
Return: Summary of backend implementation

### Subagent 2: Frontend Investigation
Explore: src/components/, src/hooks/
Return: Summary of frontend implementation

### Subagent 3: Test Coverage Analysis
Explore: tests/, __tests__/
Return: Summary of test coverage and patterns

### Main Agent: Synthesize
- Wait for all subagent reports
- Combine into coherent understanding
- Minimal context consumption
```

### Serial Deep-Dive Pattern

```markdown
## Task: Implement complex feature

### Phase 1 (Subagent): Research
- Explore codebase for similar patterns
- Identify relevant files
- Return: List of files and patterns to use

### Clear Context

### Phase 2 (Main Agent): Implementation
- Load only files identified in Phase 1
- Implement with focused context
- Run validation

### Phase 3 (Subagent): Review
- Review changes for issues
- Check for missed edge cases
- Return: Review summary
```

## Natural Compaction Points

### Ideal Times to Compact/Clear

1. **After completing a commit**
   - Work is saved, safe to reset
   - Natural breakpoint

2. **After validation passes**
   - Milestone achieved
   - Summary can capture state

3. **Before switching tasks**
   - Different context needed
   - Clean slate helpful

4. **When confused or going in circles**
   - Context may be polluted
   - Fresh start often helps

5. **After extensive exploration**
   - Lots of read-only context
   - Only findings matter

### Avoid Compacting/Clearing When

- In the middle of multi-file edit
- Debugging with important stack traces
- User just provided important context
- Validation has not been run

## Context Budget Planning

### For Large Tasks

```markdown
## Context Budget: [Task Name]

### Estimated Context Usage:
- CLAUDE.md: ~500 tokens
- Core source files (5 files): ~5000 tokens
- Test files: ~2000 tokens
- Working space: ~10000 tokens
- Buffer: ~2500 tokens

### Total Planned: ~20000 tokens

### Mitigation Strategies:
1. Read only essential files initially
2. Delegate test analysis to subagent
3. Compact after each commit
4. Keep exploration in subagents
```

### For Unknown Tasks

```markdown
## Unknown Scope Task

### Phase 1: Scoping (Subagent)
- Light context exploration
- Return scope estimate

### Phase 2: Planning (Main - Minimal Context)
- Review scope
- Create implementation plan
- Identify context needs

### Phase 3: Execution (Main - Focused Context)
- Load only required files
- Execute plan
- Compact between major steps
```

## Integration with Other Skills

### With ralph-validation
- Clear context after successful validation
- Start fresh for next task

### With gap-learning
- Document context-related gaps
- "Ran out of context during X"

### With git-workflow
- Natural clear point: after commit
- Natural compact point: before PR

### With todo-management
- Update TODOs before clear
- Preserve task state externally
