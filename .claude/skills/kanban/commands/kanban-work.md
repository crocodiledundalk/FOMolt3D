---
description: Work on a kanban task with automatic status updates and blocking workflow
allowed-tools: Bash, mcp__notion__notion-update-page
---

# Work on Kanban Task

You are working on a task from the Notion kanban board.

## Configuration

Read the Notion credentials from the project's CLAUDE.md and pass them inline:
```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc <command>
```

## Task

$ARGUMENTS

## Workflow

### Step 1: Pick Up Task

If a task URL/ID was provided, get its details:

```bash
notion-cc get-status <page-id>
```

If no task specified, list available tasks:

```bash
notion-cc list "Not started"
notion-cc list "In progress"
```

### Step 2: Start Working

Move task to "In progress" and update status:

```bash
notion-cc move-status <page-id> "In progress"
notion-cc update-status <page-id> "Starting work on task..."
```

### Step 3: Work on Task

As you work, update status at meaningful milestones:

```bash
notion-cc update-status <page-id> "Implementing feature X..."
notion-cc update-status <page-id> "Testing implementation..."
```

### Step 4: If Blocked - Ask Human and Wait

When you need human input:

```bash
# Block the task with your question
notion-cc set-blocked <page-id> true "Your question here?"

# Wait for response (polls until human edits Current Status or unchecks Blocked)
notion-cc wait-for-response <page-id> --timeout=300000

# Unblock and acknowledge response
notion-cc set-blocked <page-id> false
notion-cc update-status <page-id> "Received response, continuing..."
```

The human responds by:
- Editing "Current Status" to add "Answer: [their response]"
- Or unchecking the "Blocked" checkbox in Notion

### Step 5: Complete Task

When finished:

```bash
notion-cc update-status <page-id> "Completed - [summary of what was done]"
notion-cc move-status <page-id> "Done"
```

## Best Practices

1. **Update status frequently** - Keep the board reflecting current state
2. **Block early** - Don't guess, ask when you need clarity
3. **Clear questions** - Make it easy for human to respond
4. **Acknowledge responses** - Update status when you receive an answer
5. **Complete cleanly** - Summarize what was accomplished
