---
description: Check kanban board for blocked tickets that are now actionable
allowed-tools: Bash, mcp__notion__notion-update-page
---

# Check for Human Responses

You are checking the Notion kanban board for human responses to tickets YOU (Claude) blocked.

When Claude blocks a ticket, it's asking the human a question. This command checks if the human has answered.

## Configuration

Read the Notion credentials from the project's CLAUDE.md and pass them inline:
```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc <command>
```

## Workflow

### Step 1: List Blocked Tasks

```bash
notion-cc list-blocked
```

### Step 2: Check Each Blocked Task

For each blocked task shown:

```bash
notion-cc get-status <page-id>
```

Look for responses in the Current Status:
- Text starting with "Answer:" or "Response:"
- Any change from the original "BLOCKED: ..." message

### Step 3: Report Findings

Present a structured summary:

```
## Checking for Human Responses

### Responses Received (Ready to Resume)
1. **[Ticket Name]**
   - My question: [what Claude asked]
   - Human's response: [what they answered]
   -> Ready to unblock and continue

### Still Awaiting Response
1. **[Ticket Name]**
   - My question: [what Claude asked]

### Board Summary
- Blocked awaiting response: N
- In Progress: N
- Not Started: N
- Done: N
```

### Step 4: Prompt for Action

If there are actionable items:
"Found [N] blocked tickets with responses. Would you like me to unblock and resume work on any of these?"

## Unblocking a Task

When ready to unblock:

```bash
notion-cc set-blocked <page-id> false
notion-cc update-status <page-id> "Unblocked - received answer. Continuing with..."
```

## Notes

- Be conservative: only mark as "actionable" if there's clear evidence of a response
- Always ask before unblocking and resuming work
- When unblocking, update Current Status to acknowledge the response
