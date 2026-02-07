---
description: Create kanban tickets from a plan or task breakdown
allowed-tools: mcp__notion__notion-create-pages, mcp__notion__notion-fetch, Bash
---

# Create Tickets from Plan

You are creating tickets on the Notion kanban board from a plan.

## Configuration

Read the Notion credentials from the project's CLAUDE.md:
- `NOTION_API_KEY` - The API key
- `NOTION_DATABASE_ID` - The database ID
- `NOTION_DATA_SOURCE_ID` - The data source ID (use this for creating pages)

## Input

$ARGUMENTS

## Workflow

### Step 1: Parse the Plan

Break down the provided plan into discrete, actionable tasks. Each ticket should be:
- **Atomic**: Single responsibility, clearly completable
- **Action-oriented**: Title starts with a verb (Implement, Add, Fix, Create, Update, etc.)
- **Specific**: Clear enough that progress can be measured

### Step 2: Confirm with User

Before creating, present the proposed tickets:

```
I'll create the following tickets:

1. [Ticket name] - [brief description]
2. [Ticket name] - [brief description]
...

Does this look right? Any changes needed?
```

### Step 3: Create Tickets

Use `mcp__notion__notion-create-pages` with the data source ID from CLAUDE.md:

```json
{
  "parent": {"data_source_id": "<NOTION_DATA_SOURCE_ID from CLAUDE.md>"},
  "pages": [
    {
      "properties": {
        "Name": "Task title here",
        "Status": "Not started",
        "Current Status": "Created from plan: [plan description]",
        "Blocked": "__NO__"
      }
    }
  ]
}
```

### Step 4: Report Results

After creating, verify with CLI:

```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc list "Not started"
```

List all created tickets with their Notion URLs.

## Guidelines

- Group related tasks logically
- Order tickets by dependency (independent tasks first)
- Keep ticket names concise but descriptive
- Add context in Current Status about the source plan
- Batch create tickets (up to 100 per call) for efficiency
