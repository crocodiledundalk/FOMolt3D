---
name: repo-structure
description: Validates and enforces the correct structure for all resources in this repository (skills, commands, templates, guides). Use after creating or modifying any resource to ensure it follows the required format.
---

# Repository Structure Enforcement

This skill ensures all resources in the Claude Code Resource Hub follow the correct structure and format.

## When to Use

- After creating a new skill, command, template, or guide
- After modifying an existing resource
- When reviewing resources for compliance
- Before committing changes to the repository

## Resource Structures

### Skills (`skills/<category>/<skill-name>/SKILL.md`)

**Required Structure:**
```yaml
---
name: skill-name
description: Clear description of what this skill does and when to use it
allowed-tools: Tool1, Tool2  # Optional: restrict available tools
---

# Skill Title

Brief introduction to the skill's purpose.

## When to Use

- Trigger condition 1
- Trigger condition 2

## [Domain-specific sections...]

## Best Practices

1. Do this
2. Avoid that
```

**Validation Checklist:**
- [ ] File is named `SKILL.md` (uppercase)
- [ ] Has valid YAML frontmatter with `---` delimiters
- [ ] `name` field is lowercase, hyphenated (e.g., `my-skill-name`)
- [ ] `description` is a single line explaining when to use the skill
- [ ] Has "When to Use" section with bullet points
- [ ] Located in correct category: `skills/general/`, `skills/solana/`, `skills/web-development/`, or `skills/marketing/`

**Categories:**
| Category | Directory | Purpose |
|----------|-----------|---------|
| Foundation | `skills/general/` | Workflow, process, general tools |
| Solana | `skills/solana/` | Blockchain development |
| Web Development | `skills/web-development/` | NestJS, Next.js, web tools |
| Marketing | `skills/marketing/` | Content, research, brand |

---

### Commands (`commands/<command-name>.md`)

**Required Structure:**
```markdown
# /command-name

Brief description of what this command does.

## Usage

```
/command-name [arguments]
```

## What It Does

1. Step 1
2. Step 2
3. Step 3

## Examples

[Usage examples...]
```

**Validation Checklist:**
- [ ] Filename matches command name (e.g., `kanban.md` for `/kanban`)
- [ ] Has clear usage section
- [ ] Documents what the command does step-by-step
- [ ] Includes examples

---

### Templates (`guides/templates/CLAUDE-<type>.md`)

**Required Structure:**
```markdown
# [Type] Project Template

Brief description of what this template is for.

---

## Project Overview

```markdown
# Project: [Project Name]

[Template content for users to fill in...]
```

## Directory Structure

[Standard directory layout...]

## Essential Commands

[Key commands for this project type...]

## Required Skills

[Skills that should be used with this template...]

## [Type-specific sections...]

## Quality Checklist

[Pre-commit/quality checklist...]
```

**Validation Checklist:**
- [ ] Filename follows pattern: `CLAUDE-<type>.md`
- [ ] Has Project Overview section
- [ ] Has Directory Structure section
- [ ] Has Essential Commands section
- [ ] References relevant skills from this repository
- [ ] Includes quality/pre-commit checklist

---

### Guides (`guides/docs/<guide-name>.md`)

**Required Structure:**
```markdown
# Guide Title

Brief introduction.

---

## Overview

[What this guide covers...]

## [Content sections...]

## [Examples/Reference...]
```

**Validation Checklist:**
- [ ] Located in `guides/docs/`
- [ ] Has clear overview section
- [ ] Well-organized with headers
- [ ] Includes examples where appropriate

---

## Validation Process

When validating a resource:

### 1. Check File Location
```bash
# Skills should be in:
skills/<category>/<skill-name>/SKILL.md

# Commands should be in:
commands/<command-name>.md

# Templates should be in:
guides/templates/CLAUDE-<type>.md

# Guides should be in:
guides/docs/<guide-name>.md
```

### 2. Validate Frontmatter (Skills only)
```bash
# Check first 10 lines for valid frontmatter
head -10 <file>

# Should see:
# ---
# name: ...
# description: ...
# ---
```

### 3. Check Required Sections
Each resource type has required sections (see above). Verify they exist.

### 4. Verify Naming Conventions
- Skill names: lowercase, hyphenated (`my-skill`)
- Command files: lowercase, match command name (`kanban.md`)
- Template files: `CLAUDE-<type>.md` pattern
- Guide files: descriptive, uppercase for acronyms (`COMMANDS-REFERENCE.md`)

---

## Common Issues

### Skills

**Issue:** Missing frontmatter
```markdown
# Bad - no frontmatter
# My Skill

Content...
```
```markdown
# Good - has frontmatter
---
name: my-skill
description: Does X when Y
---

# My Skill

Content...
```

**Issue:** Wrong category
- Security audit skill in `skills/general/` → Move to `skills/solana/`
- NestJS skill in `skills/solana/` → Move to `skills/web-development/`

### Commands

**Issue:** Missing usage section
- Always include a code block showing how to invoke the command

### Templates

**Issue:** Not referencing repository skills
- Templates should explicitly reference skills from this repo
- Use relative links: `[skill-name](../../skills/category/skill-name/SKILL.md)`

---

## After Validation

If a resource passes validation:
1. Invoke the `repo-docs-sync` skill to update documentation
2. Verify the resource appears correctly in README.md and INDEX.md

If a resource fails validation:
1. Fix the identified issues
2. Re-run validation
3. Then proceed to documentation sync
