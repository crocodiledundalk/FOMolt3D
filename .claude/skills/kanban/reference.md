# Kanban Board Reference

## Configuration

Add these to your project's CLAUDE.md:

```markdown
## Notion Kanban Configuration
NOTION_API_KEY: ntn_xxx
NOTION_DATABASE_ID: xxx
NOTION_DATA_SOURCE_ID: xxx-xxx-xxx
```

When running commands, read these values from CLAUDE.md and pass inline:
```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc <command>
```

## Property Reference

| Property | Type | API Values | Description |
|----------|------|------------|-------------|
| Name | title | string | The ticket/task name |
| Status | status | "Not started", "In progress", "Done" | Workflow state |
| Current Status | text | string | Free-form progress notes |
| Blocked | checkbox | `__YES__` / `__NO__` | Human attention flag |

---

## notion-cc CLI Quick Reference

### Board Commands

```bash
notion-cc list                    # All tasks by status
notion-cc list-blocked            # Only blocked tasks
notion-cc list "In progress"      # Filter by status
```

### Task Commands

```bash
notion-cc get-status <id>         # Get task properties
notion-cc get-task <id>           # Get FULL task (body + comments)
notion-cc update-status <id> "m"  # Update progress notes
notion-cc move-status <id> "Done" # Change workflow status
notion-cc set-blocked <id> true "question"  # Block with question
notion-cc set-blocked <id> false  # Unblock
notion-cc comment <id> "text"     # Add a comment
notion-cc create-task "Name"      # Create new task
```

### Autonomous Monitoring Commands

```bash
notion-cc next                    # Get next actionable task (JSON)
notion-cc watch                   # Watch board indefinitely
notion-cc watch --interval=30000  # Poll every 30 seconds
notion-cc wait-for-response <id>  # Poll until human responds
```

---

## Card Content Structure

Every task card should contain enough context for a fresh agent:

```markdown
## Overview
What needs to be done.

## Requirements
- Specific requirements
- Success criteria
- Constraints

## Context
- File paths
- PRD references
- Dependencies

## Skills
- Required skill-1
- Required skill-2

## Progress
- [x] Completed step
- [ ] Next step

## Notes
Decisions, responses, important info.
```

---

## Autonomous Workflow

### Phase 1: Work on Tasks

```bash
# Get next task
notion-cc next
# Returns: { action: "start"|"resume"|"unblock_and_resume"|"wait", task: {...} }

# If action is "start" or "resume":
notion-cc get-task <taskId>
# Spawn agent to work on it
# Repeat until action is "wait"
```

### Phase 2: Monitor for Changes

```bash
# When action is "wait":
notion-cc watch

# Events:
# - new_task: New task added
# - task_unblocked: Task was unblocked
# - new_comment: Comment added
# - status_changed: Task moved
```

### Phase 3: Handle Events

When an event occurs:
1. Get task details: `notion-cc get-task <taskId>`
2. Spawn agent with task context
3. Continue watching

---

## Blocking Workflow

### When to Block

- Need clarification on requirements
- Discovered ambiguity in the task
- Need human decision on approach
- Encountered unexpected issue requiring human judgment

### Block a Task

```bash
notion-cc set-blocked <page-id> true "Clear question for human?"
```

This will:
1. Set Blocked checkbox to true
2. Update Current Status to "BLOCKED: [question]"
3. Add a comment with the question (if permissions allow)

### Wait for Response

```bash
# Wait for specific task
notion-cc wait-for-response <page-id> --timeout=300000

# Or watch entire board
notion-cc watch
```

Human responds by:
- Adding a comment (preferred)
- Editing Current Status to add "Answer: [response]"
- Unchecking the Blocked checkbox

### Unblock and Continue

```bash
notion-cc set-blocked <page-id> false
notion-cc update-status <page-id> "Received answer: X. Continuing with..."
```

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/kanban` | Board overview and management |
| `/kanban-check` | Check for human responses to blocked tasks |
| `/kanban-plan <desc>` | Create tickets from a plan |
| `/kanban-work <task>` | Work on a task with full workflow |
| `/kanban-monitor` | Start continuous board monitoring |

---

## Best Practices

1. **Never stop monitoring** - Always be working or watching
2. **Use comments for questions** - More visible than status field
3. **Keep cards updated** - Progress and notes should be current
4. **Include full context** - Cards should be self-contained
5. **Spawn agents for parallel work** - Don't work sequentially
6. **React to events immediately** - Handle new tasks and responses promptly
