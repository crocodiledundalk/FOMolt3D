---
name: subagent-orchestration
description: "Strategic use of subagents for parallelization, context preservation, and specialized tasks. Maximizes throughput while maintaining coherence."
---

# Subagent Orchestration Skill

This skill provides patterns for effectively delegating work to subagents, enabling parallel execution and context-efficient workflows.

## When to Use Subagents

### High-Value Subagent Use Cases

| Use Case | Benefit | Example |
|----------|---------|---------|
| **Parallel exploration** | Speed | Explore 4 directories simultaneously |
| **Context preservation** | Main context stays clean | Deep-dive research without bloat |
| **Specialized tasks** | Focused execution | Security review, performance analysis |
| **Verification** | Independent validation | Code review by separate agent |
| **Bulk operations** | Throughput | Update 50 files in parallel |

### When NOT to Use Subagents

- Simple, quick tasks (<2 minutes)
- Tasks requiring iterative user feedback
- Work that needs to reference prior conversation
- Tasks with complex interdependencies

## Subagent Patterns

### Pattern 1: Parallel Exploration

**Purpose**: Understand a codebase quickly by exploring multiple areas simultaneously

```markdown
## Parallel Exploration Task

### Goal: Understand [feature/system]

### Spawn Subagents:

**Subagent 1 - Backend**
```
Explore the src/api/ and src/services/ directories.
Find all code related to [feature].
Return: Summary of backend implementation, key files, and patterns used.
```

**Subagent 2 - Frontend**
```
Explore the src/components/ and src/pages/ directories.
Find all code related to [feature].
Return: Summary of frontend implementation, component hierarchy, and state management.
```

**Subagent 3 - Data Layer**
```
Explore the src/models/ and src/database/ directories.
Find all schemas and migrations related to [feature].
Return: Summary of data structures, relationships, and key queries.
```

**Subagent 4 - Tests**
```
Explore the tests/ and __tests__/ directories.
Find all tests for [feature].
Return: Summary of test coverage, testing patterns, and gaps identified.
```

### Synthesis (Main Agent):
After all subagents return, combine findings into coherent understanding.
```

### Pattern 2: Parallel Implementation

**Purpose**: Implement independent features simultaneously

```markdown
## Parallel Implementation Task

### Goal: Implement [feature set]

### Conflict Prevention:
- Each subagent works in DISJOINT files
- No overlapping imports/exports
- Clear interface contracts defined upfront

### Subagent Assignments:

**Subagent 1 - User Service**
Files: src/services/user.ts, src/types/user.ts
Task: Implement user CRUD operations
Interface: `createUser(data): User, getUser(id): User, ...`

**Subagent 2 - Auth Service**
Files: src/services/auth.ts, src/types/auth.ts
Task: Implement authentication logic
Interface: `login(creds): Token, verify(token): User, ...`

**Subagent 3 - API Routes**
Files: src/routes/user.ts, src/routes/auth.ts
Task: Implement REST endpoints
Dependencies: Waits for Service interfaces

### Integration (Main Agent):
1. Verify no file conflicts
2. Run integration tests
3. Fix any interface mismatches
```

### Pattern 3: Bulk Refactoring

**Purpose**: Apply consistent changes across many files

```markdown
## Bulk Refactoring Task

### Goal: [Refactoring description]
### Files Affected: [N files]

### Step 1 (Main Agent): Define Transformation
```typescript
// Example: Rename function across codebase
// Old: getUserById(id)
// New: findUserById(id)
```

### Step 2: Identify All Instances
```bash
grep -r "getUserById" src/ --include="*.ts" | wc -l
# Result: 47 files
```

### Step 3: Partition Files
Group files into batches of 10-15 for parallel processing.

**Subagent 1**: Files 1-12
**Subagent 2**: Files 13-24
**Subagent 3**: Files 25-36
**Subagent 4**: Files 37-47

Each subagent:
- Apply transformation to assigned files
- Run file-level linting
- Report: Files modified, any issues found

### Step 4 (Main Agent): Verification
- Run full test suite
- Check for missed instances
- Review any reported issues
```

### Pattern 4: Independent Verification

**Purpose**: Get unbiased review of work

```markdown
## Independent Verification Task

### Context: Just completed [feature/change]

### Subagent: Code Reviewer
```
Review the following changes with fresh eyes:
[List of modified files]

Check for:
- Logic errors or bugs
- Security vulnerabilities
- Performance issues
- Missing edge cases
- Code style violations
- Test coverage gaps

Return: Detailed review with specific line references and recommendations.
```

### Main Agent Response:
Based on review, either:
1. Address identified issues
2. Justify why issue is not applicable
3. Create TODO for future improvement
```

### Pattern 5: Research and Implement

**Purpose**: Separate research from implementation for context efficiency

```markdown
## Research and Implement Task

### Phase 1: Research (Subagent)
```
Research how to implement [feature] in this codebase.
Examine:
- Similar existing implementations
- Project conventions and patterns
- Relevant dependencies/libraries
- Test patterns used

Return:
- Recommended approach
- Key files to reference
- Gotchas to avoid
- Estimated scope
```

### [Clear main context after receiving research]

### Phase 2: Implement (Main Agent)
With research summary, implement with minimal context:
- Load only files identified in research
- Follow recommended approach
- Apply project conventions
```

## Subagent Communication

### Task Prompt Template

```markdown
## Task for Subagent

### Context
[Brief background - keep minimal]

### Objective
[Clear, specific goal]

### Scope
Files to examine: [List]
Files to modify: [List or "read-only"]

### Constraints
- [Constraint 1]
- [Constraint 2]

### Expected Output
Return a summary including:
- [Specific output 1]
- [Specific output 2]
- [Any issues or blockers found]

### Do NOT:
- [Anti-pattern to avoid]
- [Out of scope action]
```

### Receiving Subagent Output

```markdown
## Subagent Report Integration

### From Subagent [N]: [Task Name]

### Summary Received:
[Paste key findings]

### Actionable Items:
1. [Action from this report]
2. [Action from this report]

### Conflicts/Issues:
- [Any conflicts with other subagent outputs]

### Integration Status: [Pending/Complete]
```

## Coordination Strategies

### Avoiding Conflicts

1. **File-level partitioning**: Each subagent owns specific files
2. **Interface contracts**: Define APIs before implementation
3. **Sequential dependencies**: Wait for outputs when needed
4. **Conflict detection**: Compare touched files after completion

### Maximizing Parallelism

```markdown
## Dependency Analysis

Tasks: A, B, C, D, E

Dependencies:
- A: None
- B: None
- C: Depends on A
- D: Depends on B
- E: Depends on C and D

Execution Plan:
Round 1 (Parallel): A, B
Round 2 (Parallel): C, D (after A, B complete)
Round 3 (Sequential): E (after C, D complete)
```

## Integration with Other Skills

### With context-management
- Subagents preserve main context
- Use for any exploration/research

### With ralph-validation
- Subagent for independent validation
- Reduces confirmation bias

### With todo-management
- Subagent tasks become TODOs
- Track parallel work progress

### With git-workflow
- Each subagent's work = potential commit
- Coordinate before committing

## Limitations

- Subagents cannot spawn other subagents
- No interactive mode in subagents
- Limited visibility during execution
- Fresh context each invocation

## Best Practices

### Do
- Give clear, specific instructions
- Define expected output format
- Partition work to avoid conflicts
- Synthesize outputs thoughtfully
- Use for heavy exploration

### Don't
- Over-parallelize simple tasks
- Assume subagents share context
- Skip conflict checking
- Ignore subagent warnings
- Use for tasks needing user input
