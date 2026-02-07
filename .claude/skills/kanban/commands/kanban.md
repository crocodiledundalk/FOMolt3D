---
description: Manage the Notion kanban board - create tickets, update progress, check for actionable items
allowed-tools: mcp__notion__notion-search, mcp__notion__notion-fetch, mcp__notion__notion-create-pages, mcp__notion__notion-update-page, mcp__notion__notion-get-comments, Bash
---

# Kanban Board Management

You are managing a Notion kanban board.

## Configuration

Read the Notion credentials from the project's CLAUDE.md (look for "Notion Kanban Configuration" section):
- `NOTION_API_KEY` - The API key (starts with `ntn_`)
- `NOTION_DATABASE_ID` - The database ID
- `NOTION_DATA_SOURCE_ID` - The data source ID

Pass these inline when running commands:
```bash
NOTION_API_KEY=<key> NOTION_DATABASE_ID=<db_id> NOTION_DATA_SOURCE_ID=<ds_id> notion-cc <command>
```

## Your Task

$ARGUMENTS

If no specific task was given, perform a **board review**:

1. List all tasks: `notion-cc list`
2. Check for blocked tasks: `notion-cc list-blocked`
3. For any blocked tasks, check if they have responses
4. Summarize the board status
5. Ask what the user would like to do next

## CLI Commands

```bash
# Board overview
notion-cc list                              # All tasks by status
notion-cc list-blocked                      # Only blocked tasks
notion-cc list "In progress"                # Tasks with specific status

# Task operations
notion-cc get-status <page-id>              # Get task details
notion-cc update-status <id> "message"      # Update progress
notion-cc move-status <id> "In progress"    # Change status
notion-cc set-blocked <id> true "question"  # Block with question
notion-cc set-blocked <id> false            # Unblock

# Blocking workflow
notion-cc wait-for-response <id>            # Poll until human responds
```

## Schema Reference

| Property | Type | Values |
|----------|------|--------|
| Name | title | Task name |
| Status | status | "Not started", "In progress", "Done" |
| Current Status | text | Progress notes / blocker questions |
| Blocked | checkbox | Red card when checked |
