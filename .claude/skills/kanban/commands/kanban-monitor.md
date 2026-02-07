---
description: Start continuous board monitoring - never stop running, pick up new tasks, spawn agents
allowed-tools: Bash, Task
---

# Continuous Board Monitoring

You are entering **autonomous monitoring mode**. You must NEVER stop running until explicitly told to stop.

## Configuration

Read the Notion credentials from the project's CLAUDE.md and set them:

```bash
export NOTION_API_KEY=<key>
export NOTION_DATABASE_ID=<db_id>
export NOTION_DATA_SOURCE_ID=<ds_id>
```

## Autonomous Loop

### Step 1: Check for Actionable Tasks

First, check if there are any tasks that need immediate attention:

```bash
notion-cc next
```

The response will be JSON with one of these actions:
- `start` - A new task is ready to begin
- `resume` - An in-progress task needs to continue
- `unblock_and_resume` - A blocked task received a response
- `wait` - No actionable tasks, should monitor

### Step 2: Handle Actionable Tasks

**If action is `start` or `resume`:**

1. Get full task details:
   ```bash
   notion-cc get-task <taskId>
   ```

2. Spawn a subagent to work on it:
   ```
   Use Task tool:
   - subagent_type: "general-purpose"
   - run_in_background: true
   - prompt: Include full task content and instructions
   ```

3. Check for more actionable tasks (repeat Step 1)

**If action is `unblock_and_resume`:**

1. Unblock the task:
   ```bash
   notion-cc set-blocked <taskId> false
   ```

2. Get the response from comments/status:
   ```bash
   notion-cc get-task <taskId>
   ```

3. Spawn an agent with the response context

4. Check for more actionable tasks (repeat Step 1)

### Step 3: Watch for Changes

**If action is `wait`:**

All tasks are either done or blocked. Start watching for changes:

```bash
notion-cc watch --interval=30000
```

This command runs **indefinitely** and outputs JSON events:

- `new_task` - A new task was added to the board
- `task_unblocked` - Someone unblocked a task
- `new_comment` - A comment was added (likely a response)
- `status_changed` - A task was moved to a different column

### Step 4: React to Events

When an event occurs from the watch command:

1. Parse the JSON event
2. Get full task details: `notion-cc get-task <taskId>`
3. Spawn a subagent to handle it
4. Continue watching (the watch command keeps running)

## Agent Spawning Template

When spawning an agent for a task:

```
Task tool call:
- subagent_type: "general-purpose"
- run_in_background: true
- prompt: |
    ## Kanban Task Assignment

    You are assigned to work on this kanban task autonomously.

    ### Task Details
    ID: <taskId>
    Title: <title>
    URL: <url>

    ### Task Content
    <content from get-task>

    ### Comments/Responses
    <any comments>

    ### Instructions
    1. Move task to "In progress": `notion-cc move-status <id> "In progress"`
    2. Update progress as you work: `notion-cc update-status <id> "message"`
    3. If blocked, ask and wait:
       ```
       notion-cc set-blocked <id> true "Your question?"
       notion-cc wait-for-response <id>
       notion-cc set-blocked <id> false
       ```
    4. When done: `notion-cc move-status <id> "Done"`

    ### Credentials
    NOTION_API_KEY=<key>
    NOTION_DATABASE_ID=<db_id>
    NOTION_DATA_SOURCE_ID=<ds_id>
```

## Critical Rules

1. **NEVER STOP** - Always be either working on tasks or watching for new ones
2. **SPAWN AGENTS** - Don't work sequentially, spawn background agents for parallel work
3. **KEEP MONITORING** - After spawning an agent, check for more tasks or continue watching
4. **REACT TO EVENTS** - When watch outputs an event, handle it immediately

## Example Session

```
> notion-cc next
{"action":"start","task":{"id":"abc123",...}}

> notion-cc get-task abc123
{full task details}

[Spawn agent for abc123 in background]

> notion-cc next
{"action":"start","task":{"id":"def456",...}}

[Spawn agent for def456 in background]

> notion-cc next
{"action":"wait","message":"No actionable tasks..."}

> notion-cc watch --interval=30000
[2024-01-15T10:00:00Z] Watching board for changes...
[2024-01-15T10:00:30Z] Poll complete. 5 tasks tracked.
{"event":"new_comment","taskId":"abc123","commentText":"Use PostgreSQL",...}

[Get task details and spawn agent to handle response]

[Continue watching...]
```

## When to Stop

Only stop monitoring when:
1. The user explicitly says to stop
2. The user ends the session
3. A critical error occurs that cannot be recovered

Otherwise, **keep running indefinitely**.
