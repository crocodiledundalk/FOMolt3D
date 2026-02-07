---
name: kanban
description: Manage the Notion kanban board for task tracking. Use when creating tickets from plans, updating progress, changing status, flagging blockers, or checking for actionable items that were previously blocked.
allowed-tools: mcp__notion__notion-search, mcp__notion__notion-fetch, mcp__notion__notion-create-pages, mcp__notion__notion-update-page, mcp__notion__notion-get-comments, Bash
---

# Kanban Board Management

Manage the Notion kanban board for tracking tasks and enabling **autonomous, continuous operation** while the operator is away.

## CRITICAL: Autonomous Operation Mode

**Claude must NEVER stop running when the operator is away.** The default behavior is:

1. Work on available tasks
2. When all tasks are done or blocked, **monitor the board** for changes
3. When new tasks appear or blocked tasks are unblocked, **spawn agents** to work on them
4. Repeat indefinitely

### Continuous Monitoring Loop

When there are no immediately actionable tasks:

```bash
# Check for next actionable task
notion-cc next

# If action is "wait", start watching the board
notion-cc watch --interval=30000  # Poll every 30 seconds

# The watch command runs indefinitely and outputs JSON events:
# - new_task: A new task was added
# - task_unblocked: A blocked task was unblocked (or response received)
# - new_comment: A comment was added (user responded)
# - status_changed: Task moved to different column
```

### Spawning Agents for Tasks

When a task becomes actionable (new task or unblocked):

```bash
# Get full task details including body content and comments
notion-cc get-task <page-id>
```

Then spawn a subagent with the task context:

```
Use Task tool with:
- subagent_type: "general-purpose"
- prompt: Include the full task JSON from get-task
- The task body contains all context needed for the agent
```

---

## Configuration

The kanban board credentials should be in the project's CLAUDE.md:

```markdown
## Notion Kanban Configuration
NOTION_API_KEY: ntn_xxx
NOTION_DATABASE_ID: xxx
NOTION_DATA_SOURCE_ID: xxx-xxx-xxx
```

When running `notion-cc` commands, pass these values inline:

```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc <command>
```

---

## Card Content Structure (Mini-CLAUDE.md)

**Every task card must contain enough context for a fresh agent to pick it up.** The card body should include:

### Required Sections

```markdown
## Overview
Brief description of what needs to be done.

## Requirements
- Specific, measurable requirements
- Success criteria that can be verified
- Any constraints or limitations

## Context
- Relevant file paths
- Related PRDs or specs (summarized)
- Dependencies on other tasks

## Skills
Required skills for this task (if any):
- skill-name-1
- skill-name-2

## Progress
- [x] Completed step 1
- [x] Completed step 2
- [ ] Next step to do
- [ ] Remaining work

## Notes
Any additional context, decisions made, or important information.
Human responses and answers should be captured here.
```

### Updating Cards During Work

As you work on a task, **keep the card updated**:

1. Check off completed items in Progress
2. Add notes about decisions or changes
3. Update Current Status field with latest progress
4. If blocked, add your question to both Current Status AND as a comment

---

## Interaction Model: Comments First

**The preferred interaction method is via Notion comments.**

### Asking Questions

When you need human input:

1. Add your question as a **comment** on the card
2. Set the card as blocked with the same question in Current Status
3. Monitor for responses

```bash
# Block and add question as comment
notion-cc set-blocked <page-id> true "Should I use PostgreSQL or SQLite?"

# This does both:
# - Sets Blocked checkbox to true
# - Updates Current Status to "BLOCKED: Should I use PostgreSQL or SQLite?"
# - Adds a comment with the question (if permissions allow)
```

### Receiving Responses

The human can respond by:
1. **Adding a comment** (preferred) - You'll detect this via `watch` or `wait-for-response`
2. **Editing Current Status** to include "Answer: ..."
3. **Unchecking the Blocked checkbox**

### Monitoring for Responses

```bash
# Wait for response on a specific task (blocks until response)
notion-cc wait-for-response <page-id>

# Or watch the entire board for any changes
notion-cc watch
```

---

## CLI Commands

### Board Commands

```bash
# List all tasks grouped by status
notion-cc list

# List only blocked tasks
notion-cc list-blocked

# List tasks with specific status
notion-cc list "In progress"
```

### Task Commands

```bash
# Get task properties (status, blocked, current status)
notion-cc get-status <page-id>

# Get FULL task details (includes body content and comments)
notion-cc get-task <page-id>

# Update progress notes
notion-cc update-status <page-id> "Working on feature X..."

# Move task to new status
notion-cc move-status <page-id> "In progress"
notion-cc move-status <page-id> "Done"

# Block task with question for human
notion-cc set-blocked <page-id> true "Which approach should I use?"

# Unblock task
notion-cc set-blocked <page-id> false

# Add a comment
notion-cc comment <page-id> "Question or update here"
```

### Autonomous Monitoring Commands

```bash
# Get next actionable task (returns JSON)
notion-cc next
# Returns: { action: "start"|"resume"|"unblock_and_resume"|"wait", task: {...} }

# Watch board for changes indefinitely
notion-cc watch
notion-cc watch --interval=30000  # Poll every 30s

# Wait for response on specific task
notion-cc wait-for-response <page-id> --timeout=300000
```

---

## Autonomous Workflow

### Phase 1: Work on Tasks

```
1. Run `notion-cc next` to get next actionable task
2. If action is "start" or "resume":
   - Move task to "In progress"
   - Get full task details with `notion-cc get-task`
   - Work on the task (or spawn a subagent)
   - Update progress frequently
   - When done, move to "Done"
3. If action is "unblock_and_resume":
   - Unblock the task
   - Read the response from comments/status
   - Continue work
4. Repeat until action is "wait"
```

### Phase 2: Monitor for Changes

```
1. When `notion-cc next` returns action "wait":
   - No tasks need immediate attention
   - Start watching the board: `notion-cc watch`
2. When an event occurs (new_task, task_unblocked, new_comment):
   - Parse the JSON event
   - Get full task details: `notion-cc get-task <taskId>`
   - Spawn an agent to handle it
   - Continue watching
```

### Phase 3: Handle Multiple Tasks

When multiple tasks are actionable:

```
1. Run `notion-cc next` - this returns ONE task
2. Spawn a subagent for that task
3. Run `notion-cc next` again for the next task
4. Continue until all tasks are assigned
5. Monitor for task completion and new tasks
```

---

## Spawning Subagents

When spawning an agent for a task, include all context from the card:

```
Use the Task tool:
- subagent_type: "general-purpose"
- prompt: |
    Work on the following kanban task:

    Task ID: <id>
    Title: <title>
    URL: <url>

    ## Task Content
    <full body content from get-task>

    ## Comments/Responses
    <any comments from the card>

    ## Instructions
    1. Move the task to "In progress" if not already
    2. Work through the requirements
    3. Update progress on the card as you go
    4. If blocked, use notion-cc to ask questions and wait
    5. When complete, move to "Done"

    Use these credentials for notion-cc:
    NOTION_API_KEY=<key>
    NOTION_DATABASE_ID=<db_id>
    NOTION_DATA_SOURCE_ID=<ds_id>
```

---

## Best Practices

1. **Never stop monitoring** - When tasks are done, watch for new ones
2. **Keep cards updated** - Progress, notes, and status should always reflect reality
3. **Use comments for questions** - More visible and trackable than status field
4. **Include full context in cards** - New agents should be able to pick up any task
5. **Spawn agents for parallel work** - Don't work sequentially when you can parallelize
6. **Check for responses frequently** - Run `/kanban-check` or use `watch` command

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/kanban` | Board overview and management |
| `/kanban-check` | Check for human responses to blocked tasks |
| `/kanban-plan <desc>` | Create tickets from a plan |
| `/kanban-work <task>` | Work on a task with full workflow |
| `/kanban-monitor` | Start continuous board monitoring |
