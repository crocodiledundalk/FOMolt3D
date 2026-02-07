---
name: project-planning
description: Comprehensive project planning skill that creates detailed CLAUDE.md, todo.md, and supporting documentation from user requirements. Discovers available skills, recommends missing ones, asks clarifying questions, and generates production-ready project scaffolding with hooks, commands, and best practices.
---

# Project Planning Skill

Transform a project idea or existing documentation into a comprehensive, well-structured project setup with CLAUDE.md, todo.md, and supporting files.

## When to Use

- Starting a new project from scratch
- Onboarding an existing codebase to Claude Code
- Restructuring a project's Claude Code configuration
- Creating a detailed implementation plan
- When you have rough requirements that need fleshing out

---

## Phase 1: Discovery

### 1.1 Discover Available Skills

**CRITICAL: Always start by checking what skills are available in the current session.**

```bash
# Check for skills in the repository
find skills -name "SKILL.md" -type f 2>/dev/null

# Check for skills in .claude directory
find .claude/skills -name "*.md" -type f 2>/dev/null

# Check for any SKILL.md files anywhere
find . -name "SKILL.md" -type f 2>/dev/null | head -50
```

**Categorize discovered skills:**

| Category | Skills Found | Relevant to Project? |
|----------|--------------|---------------------|
| Foundation | [list] | [yes/no/maybe] |
| Domain-specific | [list] | [yes/no/maybe] |
| Testing | [list] | [yes/no/maybe] |
| Security | [list] | [yes/no/maybe] |

### 1.2 Discover Available Commands

```bash
# Check for commands
ls commands/*.md 2>/dev/null
find .claude/commands -name "*.md" -type f 2>/dev/null
```

### 1.3 Discover Available Templates

```bash
# Check for templates
ls guides/templates/CLAUDE-*.md 2>/dev/null
```

### 1.4 Discover Available Hooks

```bash
# Check for hooks
ls hooks/*.sh 2>/dev/null
find . -name "*hook*" -type f 2>/dev/null
```

---

## Phase 2: Requirements Gathering

### 2.1 Analyze Input

The user may provide:
- A brief description/prompt
- Existing markdown files
- A partial CLAUDE.md
- Reference to similar projects
- Technical specifications

**For each input type, extract:**

```markdown
## Requirements Analysis

### Project Type
- [ ] Web Application (Frontend)
- [ ] Web Application (Backend)
- [ ] Web Application (Full-stack)
- [ ] CLI Tool
- [ ] Library/Package
- [ ] Blockchain/Solana Program
- [ ] Mobile Application
- [ ] Other: ___________

### Technology Stack
- **Language(s):** ___________
- **Framework(s):** ___________
- **Database:** ___________
- **Deployment:** ___________

### Project Scale
- [ ] Small (single developer, <1 month)
- [ ] Medium (small team, 1-3 months)
- [ ] Large (team, 3+ months)

### Collaboration Model
- [ ] Solo developer
- [ ] Async team (needs kanban/blocking workflow)
- [ ] Sync team
- [ ] Open source (public contributors)
```

### 2.2 Identify Clarification Needs

**CRITICAL: Create a list of questions where requirements are unclear.**

Format questions as:

```markdown
## Clarifications Needed

### High Priority (Blocking)
These must be answered before proceeding:

1. **[QUESTION_ID]** [Question text]
   - Context: [Why this matters]
   - Options: [If applicable, list options]
   - Default assumption: [What we'll assume if no answer]

### Medium Priority (Important)
These affect implementation details:

1. **[QUESTION_ID]** [Question text]
   - Context: [Why this matters]

### Low Priority (Nice to Know)
These can be refined later:

1. **[QUESTION_ID]** [Question text]
```

**Common clarification areas:**

| Area | Questions to Consider |
|------|----------------------|
| **Auth** | OAuth providers? Session vs JWT? Role-based access? |
| **Data** | Database choice? ORM preference? Caching needs? |
| **API** | REST vs GraphQL? Versioning strategy? Rate limiting? |
| **Testing** | Coverage requirements? E2E testing? CI integration? |
| **Deployment** | Platform? Environment strategy? Secrets management? |
| **Scale** | Expected load? Performance requirements? |
| **Security** | Compliance requirements? Audit needs? |

---

## Phase 3: Skill Matching

### 3.1 Match Skills to Requirements

Based on the project type and requirements, identify:

**Required Skills (Must Use):**
```markdown
| Skill | Reason | Available? |
|-------|--------|------------|
| success-criteria | Define requirements before implementation | [YES/NO] |
| git-workflow | Professional commit practices | [YES/NO] |
| ralph-validation | Quality assurance | [YES/NO] |
```

**Recommended Skills (Should Use):**
```markdown
| Skill | Reason | Available? |
|-------|--------|------------|
| [skill] | [reason] | [YES/NO] |
```

**Optional Skills (Nice to Have):**
```markdown
| Skill | Reason | Available? |
|-------|--------|------------|
| [skill] | [reason] | [YES/NO] |
```

### 3.2 Identify Missing Skills

If important skills are NOT available:

```markdown
## Missing Skills Alert

The following skills would benefit this project but are not available:

| Skill | Purpose | Recommendation |
|-------|---------|----------------|
| [skill-name] | [what it does] | [Get from X / Create custom / Skip] |

### Recommendations:
1. **[skill]**: Consider obtaining from [source] because [reason]
2. **[skill]**: Can proceed without, but [tradeoff]
```

---

## Phase 4: Document Generation

### 4.1 Generate CLAUDE.md

Create a comprehensive CLAUDE.md with:

```markdown
# Project: [PROJECT_NAME]

> [One-line description]

## Project Overview

- **Type:** [Project type]
- **Stack:** [Technologies]
- **Status:** [Planning/Active/Maintenance]

## Directory Structure

```
[Generate based on project type and framework]
```

## Essential Commands

```bash
# Development
[command]    # [description]

# Testing
[command]    # [description]

# Quality
[command]    # [description]

# Deployment
[command]    # [description]
```

## Required Skills

**IMPORTANT: These skills MUST be used for this project.**

### Before ANY Implementation
- **ALWAYS** use `success-criteria` skill to define measurable criteria
- Get explicit confirmation before proceeding

### During Development
- **ALWAYS** use `todo-management` for multi-step tasks
- **ALWAYS** use `[domain-skill]` for [domain] work
- Use `subagent-orchestration` for exploring unfamiliar code

### Before Completion
- **ALWAYS** use `ralph-validation` skill
- **ALWAYS** use `git-workflow` for commits

### Available Commands
[List relevant /commands]

## Code Style

[Language-specific conventions]

## Testing Requirements

- Minimum coverage: [X]%
- Test location: [pattern]
- Required test types: [unit/integration/e2e]

## Security Rules

[Project-specific security requirements]

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| [VAR] | Yes/No | [Description] |

## Hooks

[If using hooks, document them]

## Deployment

[Deployment process and environments]

## Critical Rules

1. **NEVER** [critical rule 1]
2. **ALWAYS** [critical rule 2]
[...]

---

## Clarifications Needed

<!-- OPERATOR: Please fill in or confirm these items -->

### [CLARIFY_1] [Question]
**Current assumption:** [assumption]
**Your answer:** ___________

### [CLARIFY_2] [Question]
**Options:** A) [option] B) [option] C) [option]
**Your choice:** ___________

[...]

---

## Placeholders

<!-- These sections need more detail -->

### [PLACEHOLDER_1] [Section Name]
TODO: [What needs to be filled in]

[...]
```

### 4.2 Generate todo.md

Create a prioritized task list:

```markdown
# Project TODO

> Generated: [timestamp]
> Status: Planning Phase

## Legend
- 🔴 Blocked - Needs clarification or external input
- 🟡 Ready - Can be started
- 🟢 In Progress - Currently being worked on
- ✅ Done - Completed

---

## Phase 1: Project Setup
Priority: CRITICAL

- [ ] 🟡 **Initialize repository**
  - Create repo structure
  - Set up version control
  - Configure .gitignore

- [ ] 🔴 **Finalize CLAUDE.md** [BLOCKED: Awaiting clarifications]
  - [ ] Resolve [CLARIFY_1]
  - [ ] Resolve [CLARIFY_2]
  - [ ] Complete placeholder sections

- [ ] 🟡 **Set up development environment**
  - [ ] Install dependencies
  - [ ] Configure linting
  - [ ] Configure testing
  - [ ] Set up pre-commit hooks

---

## Phase 2: Core Implementation
Priority: HIGH

- [ ] 🟡 **[Feature 1]**
  - Success criteria: [link to criteria]
  - Skills needed: [list]
  - [ ] Subtask 1
  - [ ] Subtask 2

- [ ] 🟡 **[Feature 2]**
  - Success criteria: [link to criteria]
  - Skills needed: [list]
  - [ ] Subtask 1
  - [ ] Subtask 2

---

## Phase 3: Testing & Quality
Priority: HIGH

- [ ] 🟡 **Set up testing infrastructure**
- [ ] 🟡 **Write unit tests**
- [ ] 🟡 **Write integration tests**
- [ ] 🟡 **Run security audit** (if applicable)

---

## Phase 4: Documentation
Priority: MEDIUM

- [ ] 🟡 **API documentation**
- [ ] 🟡 **README.md**
- [ ] 🟡 **Contributing guide** (if open source)

---

## Phase 5: Deployment
Priority: MEDIUM

- [ ] 🟡 **Set up CI/CD**
- [ ] 🟡 **Configure environments**
- [ ] 🟡 **Deploy to staging**
- [ ] 🟡 **Deploy to production**

---

## Parking Lot
Items to consider later:

- [ ] [Future enhancement 1]
- [ ] [Future enhancement 2]

---

## Blockers Log

| ID | Description | Waiting On | Created | Resolved |
|----|-------------|------------|---------|----------|
| B1 | [CLARIFY_1] | Operator | [date] | |
| B2 | [CLARIFY_2] | Operator | [date] | |
```

### 4.3 Generate Supporting Documents (As Needed)

**success-criteria.md** (if complex project):
```markdown
# Success Criteria

## [Feature/Epic 1]

### Must Have
- [ ] [Criterion 1] - Verification: [how to verify]
- [ ] [Criterion 2] - Verification: [how to verify]

### Should Have
- [ ] [Criterion 3] - Verification: [how to verify]

### Nice to Have
- [ ] [Criterion 4] - Verification: [how to verify]

## [Feature/Epic 2]
[...]
```

**decisions.md** (for architectural decisions):
```markdown
# Architecture Decision Records

## ADR-001: [Decision Title]

**Status:** Proposed / Accepted / Deprecated
**Date:** [date]

### Context
[Why this decision is needed]

### Decision
[What was decided]

### Consequences
- Positive: [benefits]
- Negative: [tradeoffs]
- Neutral: [observations]
```

**questions.md** (for async clarification):
```markdown
# Open Questions

## Awaiting Answer

### Q1: [Question]
- **Asked:** [date]
- **Context:** [why this matters]
- **Impact:** [what's blocked]
- **Default:** [what we'll assume if no answer by X]

## Answered

### Q2: [Question]
- **Asked:** [date]
- **Answered:** [date]
- **Answer:** [the answer]
- **By:** [who answered]
```

---

## Phase 5: Review and Handoff

### 5.1 Summary for Operator

Present a summary:

```markdown
## Project Planning Summary

### Generated Documents
| Document | Status | Needs Attention |
|----------|--------|-----------------|
| CLAUDE.md | Draft | [X] clarifications needed |
| todo.md | Draft | Ready for review |
| [other] | [status] | [notes] |

### Skills Configuration
| Skill | Status | Action Needed |
|-------|--------|---------------|
| [required skill] | Available | None |
| [required skill] | Missing | Recommend obtaining |

### Clarifications Required
[X] items need your input before proceeding:

1. **[CLARIFY_1]**: [brief question]
2. **[CLARIFY_2]**: [brief question]

### Placeholders to Complete
[X] sections marked as TODO need more detail:

1. **[PLACEHOLDER_1]**: [what's needed]
2. **[PLACEHOLDER_2]**: [what's needed]

### Recommended Next Steps
1. Review and answer clarification questions
2. Fill in placeholder sections
3. Confirm skill availability
4. Begin Phase 1 tasks in todo.md
```

### 5.2 Offer Refinement

```markdown
## Ready to Refine?

I can help you:
1. **Answer clarifications** - Tell me your choices and I'll update the docs
2. **Expand sections** - Point to a placeholder and I'll flesh it out
3. **Add more detail** - Specify areas that need more depth
4. **Adjust structure** - Reorganize based on your preferences
5. **Start implementation** - Begin working through the todo.md

What would you like to do next?
```

---

## Templates by Project Type

### Web Application (TypeScript/Node.js)
- Use CLAUDE-typescript.md as base
- Include: validation, error-handling, testing skills
- Hooks: pre-commit for lint/typecheck

### Solana Program
- Use CLAUDE-solana.md as base
- Include: solana-development, solana-security, litesvm skills
- Hooks: pre-commit for cargo fmt/clippy

### NestJS API
- Use CLAUDE-typescript.md + nestjs-backend skill
- Include all relevant NestJS sub-skills
- Hooks: pre-commit for lint/test

### Next.js Frontend
- Use CLAUDE-nextjs.md as base
- Include: nextjs-frontend, playwright-skill
- Hooks: pre-commit for lint/typecheck

### Async Team Project
- Use CLAUDE-kanban-async.md as base
- Include: kanban skill, blocking workflow
- Add Notion configuration section

---

## Anti-Patterns to Avoid

1. **Vague requirements** - Always push for specifics
2. **Missing skills** - Don't proceed without core skills
3. **No success criteria** - Always define before implementing
4. **Incomplete CLAUDE.md** - Better to have placeholders than gaps
5. **Unrealistic todos** - Break down into achievable tasks
6. **Skipping clarifications** - Assumptions cause rework

---

## Integration with Other Skills

| Skill | Integration Point |
|-------|-------------------|
| `success-criteria` | Generate criteria from requirements |
| `todo-management` | Create initial todo list |
| `git-workflow` | Include in CLAUDE.md workflow section |
| `ralph-validation` | Include in completion workflow |
| `kanban` | Set up board structure if async |
| `repo-structure` | Validate generated documents |
| `repo-docs-sync` | Update repo docs after setup |
