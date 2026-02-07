---
name: gap-learning
description: "Identifies knowledge and skill gaps during task execution and registers them for improvement. Creates feedback loop for continuous skill enhancement."
---

# Gap Learning Skill

This skill creates a systematic process for identifying, documenting, and learning from gaps encountered during task execution.

## Purpose

Transform every obstacle into an improvement opportunity:
- Identify patterns in what Claude struggles with
- Suggest skill updates when patterns emerge
- Recommend new skills for repeated problem types
- Create institutional knowledge from solutions

## When to Activate

### Automatic Triggers
- Task requires >2 retry cycles
- Unknown error encountered
- User correction received
- Suboptimal solution identified post-hoc
- External documentation lookup required

### Manual Triggers
- User explicitly reports an issue
- Self-assessment reveals knowledge gap
- Pattern noticed across multiple tasks

## The Gap Learning Process

### Phase 1: Gap Detection

When a gap is encountered, document it:

```markdown
## Gap Detection Report

### Gap ID: GAP-[YYYY-MM-DD]-[NNN]
### Timestamp: [ISO timestamp]
### Task Context: [What was being attempted]

### Gap Classification:
- [ ] Technical Knowledge (language, framework, API)
- [ ] Domain Knowledge (business logic, requirements)
- [ ] Process Knowledge (workflow, best practice)
- [ ] Tool Knowledge (command, configuration)
- [ ] Integration Knowledge (how systems connect)

### Gap Description:
[Clear description of what was unknown or incorrect]

### Impact:
- Time lost: [estimate]
- Retry cycles required: [N]
- User intervention required: [Yes/No]

### Resolution:
[How was the gap ultimately resolved?]

### Source of Truth:
[Where was the correct information found?]
```

### Phase 2: Pattern Analysis

Periodically analyze gaps for patterns:

```markdown
## Gap Pattern Analysis

### Analysis Period: [Date range]
### Total Gaps Recorded: [N]

### Pattern Summary:
| Category | Count | % | Top Issue |
|----------|-------|---|-----------|
| Technical | [N] | [%] | [Most common] |
| Domain | [N] | [%] | [Most common] |
| Process | [N] | [%] | [Most common] |
| Tool | [N] | [%] | [Most common] |
| Integration | [N] | [%] | [Most common] |

### Recurring Gaps (>2 occurrences):
1. [Gap description] - [N occurrences]
2. [Gap description] - [N occurrences]

### Suggested Actions:
- [Action 1]
- [Action 2]
```

### Phase 3: Skill Recommendations

Based on patterns, generate recommendations:

```markdown
## Skill Improvement Recommendations

### Existing Skill Updates:

#### [skill-name] - Priority: [High/Medium/Low]
**Current Gap:** [What the skill doesn't handle]
**Suggested Addition:**
```
[Specific content to add to skill]
```
**Expected Benefit:** [What this would prevent]

---

### New Skill Proposals:

#### Proposed: [new-skill-name]
**Problem Pattern:** [What triggers this need repeatedly]
**Scope:**
- [What the skill would cover]
- [What it would NOT cover]

**Draft Outline:**
```yaml
name: [skill-name]
description: "[Description]"
triggers:
  - [Trigger 1]
  - [Trigger 2]
sections:
  - [Section 1]
  - [Section 2]
```

**Estimated Value:** [How often this would help]
```

## Gap Registry Format

Store gaps in a structured file:

```yaml
# .claude/gaps/gap-registry.yaml

metadata:
  created: "2024-01-01"
  last_updated: "2024-01-15"
  total_gaps: 42

gaps:
  - id: "GAP-2024-01-15-001"
    timestamp: "2024-01-15T10:30:00Z"
    classification: "technical"
    description: "Unknown Jest mocking syntax for ES modules"
    resolution: "Use jest.unstable_mockModule() for ESM"
    source: "Jest documentation"
    task_context: "Writing unit tests for auth module"
    time_lost_minutes: 30
    retries: 2
    tags: ["jest", "testing", "esm"]

  - id: "GAP-2024-01-15-002"
    timestamp: "2024-01-15T14:00:00Z"
    classification: "process"
    description: "Unclear commit message conventions for this repo"
    resolution: "Added to CLAUDE.md - use conventional commits"
    source: "User feedback"
    task_context: "Creating PR for feature X"
    time_lost_minutes: 10
    retries: 1
    tags: ["git", "conventions"]

patterns:
  - pattern: "Jest ESM mocking"
    occurrences: 3
    recommendation: "Add to testing skill"
    status: "pending"
```

## Integration with Other Skills

### With CLAUDE.md
When a gap represents project-specific knowledge:
```markdown
Recommend adding to CLAUDE.md:
"When mocking in tests, use jest.unstable_mockModule() - this project uses ESM"
```

### With success-criteria
When gap affects criteria definition:
```markdown
Future criteria should explicitly address: [gap area]
```

### With ralph-validation
When gap causes validation failure:
```markdown
Add pre-check for [gap area] before validation
```

## Gap Review Workflow

### Daily (if active development)
- Review gaps from today
- Quick categorization
- Immediate fixes if obvious

### Weekly
- Pattern analysis across week's gaps
- Prioritize skill updates
- Create improvement tasks

### Monthly
- Comprehensive gap audit
- Skill effectiveness review
- Clean up resolved/outdated gaps

## Output to User

When gaps are detected, inform user:

```markdown
## Gap Detected

**While working on:** [task]
**I encountered:** [gap description]
**Resolution:** [how I resolved it]

**Recommendation:**
[ ] Add to CLAUDE.md: "[specific addition]"
[ ] Update skill [skill-name]: "[specific update]"
[ ] Create new skill: "[skill name]" for [pattern]
[ ] No action needed (one-time issue)

Should I implement any of these recommendations?
```

## Anti-Patterns

1. **Ignoring gaps**: Every stumble is learning opportunity
2. **Over-documenting**: Not every mistake needs full analysis
3. **No action**: Patterns without improvement are waste
4. **Skill bloat**: Not everything needs a skill - some go in CLAUDE.md
5. **Stale registry**: Regularly clean up resolved/obsolete gaps
