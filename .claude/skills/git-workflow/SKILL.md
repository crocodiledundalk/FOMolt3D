---
name: git-workflow
description: "Complete git workflow with atomic commits, testing gates, documentation consistency, and quality summaries. Enforces best practices for version control."
---

# Git Workflow Skill

This skill enforces professional git practices: atomic commits, testing gates, documentation sync, and meaningful commit messages.

## Core Principles

1. **Atomic commits**: One logical change per commit
2. **Test before commit**: All tests must pass
3. **Documentation sync**: Docs updated with code
4. **Meaningful history**: Commits tell a story

## Commit Workflow

### Pre-Commit Checklist

Before ANY commit, verify:

```bash
# 1. Check what's staged
git status
git diff --staged

# 2. Run linting
npm run lint

# 3. Run type checking
npm run typecheck

# 4. Run tests
npm run test

# 5. Check for secrets/sensitive data
git diff --staged | grep -iE "(api_key|password|secret|token|credential)"
```

### Commit Size Guidelines

| Change Type | Ideal Size | Max Size |
|-------------|------------|----------|
| Bug fix | 1-3 files | 5 files |
| Feature | 3-7 files | 15 files |
| Refactor | 5-10 files | 20 files |
| Docs only | Any | Any |

**If exceeding max size**, break into multiple commits:
1. Infrastructure/setup changes
2. Core implementation
3. Tests
4. Documentation
5. Cleanup/polish

### Commit Message Format

Use Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure (no behavior change)
- `docs`: Documentation only
- `test`: Adding/updating tests
- `chore`: Maintenance (deps, config)
- `perf`: Performance improvement
- `style`: Formatting (no code change)

**Examples:**

```bash
# Feature
git commit -m "feat(auth): add JWT token refresh mechanism

- Implement automatic token refresh before expiry
- Add refresh token rotation for security
- Store refresh token in httpOnly cookie

Closes #123"

# Bug fix
git commit -m "fix(api): handle null response from payment gateway

The payment gateway occasionally returns null instead of
an error object. This caused unhandled exceptions in the
checkout flow.

- Add null check before accessing response properties
- Return user-friendly error message
- Log raw response for debugging

Fixes #456"

# Refactor
git commit -m "refactor(utils): extract date formatting to shared module

Consolidates 5 duplicate date formatting implementations
into a single, well-tested utility.

No behavioral changes - all existing tests pass."
```

### Breaking Up Large Changes

When a task produces many changes:

```markdown
## Commit Plan for [Feature Name]

### Commit 1: Setup/Infrastructure
- [ ] Add new dependencies
- [ ] Create directory structure
- [ ] Add config files

### Commit 2: Core Types/Interfaces
- [ ] Define TypeScript types
- [ ] Create interfaces
- [ ] Add type exports

### Commit 3: Implementation
- [ ] Core business logic
- [ ] Error handling
- [ ] Edge cases

### Commit 4: Tests
- [ ] Unit tests
- [ ] Integration tests
- [ ] Test utilities

### Commit 5: Documentation
- [ ] README updates
- [ ] API documentation
- [ ] Code comments

### Commit 6: Integration
- [ ] Wire up to existing code
- [ ] Update imports
- [ ] Final cleanup
```

## Branch Strategy

### Branch Naming

```
<type>/<ticket-or-description>

Examples:
- feature/user-authentication
- fix/payment-null-response
- refactor/date-utils-consolidation
- docs/api-documentation
- chore/update-dependencies
```

### Branch Lifecycle

```bash
# 1. Create from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. Make atomic commits (using this skill)
# ... work ...
git add <specific-files>
git commit -m "feat: ..."

# 3. Keep up to date
git fetch origin
git rebase origin/main

# 4. Push for review
git push -u origin feature/my-feature

# 5. Create PR (see PR section below)
```

## Pull Request Workflow

### PR Checklist

Before creating PR:

```markdown
## Pre-PR Checklist

### Code Quality
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] Type checking passes
- [ ] No debug code/console.logs
- [ ] No commented-out code

### Documentation
- [ ] README updated if needed
- [ ] API docs updated if endpoints changed
- [ ] Code comments for complex logic
- [ ] CHANGELOG entry if applicable

### Testing
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Manual testing completed

### Review Prep
- [ ] Self-reviewed all changes
- [ ] Commits are atomic and well-described
- [ ] Branch is rebased on latest main
```

### PR Description Template

```markdown
## Summary

[2-3 sentences describing what this PR does and why]

## Changes

- [Bullet point for each logical change]
- [Include file/module references where helpful]

## Testing

- [How was this tested?]
- [Steps to verify manually if applicable]

## Screenshots (if UI changes)

[Before/After screenshots]

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented in migration guide)

## Related Issues

Closes #[issue-number]
```

## Documentation Sync

### What to Update

| Code Change | Documentation Update |
|-------------|---------------------|
| New feature | README, API docs |
| API change | API docs, CHANGELOG |
| Config change | README setup section |
| Breaking change | Migration guide |
| Bug fix | CHANGELOG |

### Verification

Before committing, verify docs are in sync:

```bash
# Check if README mentions new features
grep -l "feature-name" README.md

# Check API docs match implementation
# (project-specific command)

# Ensure CHANGELOG has entry
head -20 CHANGELOG.md
```

## Callouts and Assumptions

### Documenting Assumptions

In commit messages, be explicit:

```bash
git commit -m "feat(api): add rate limiting to auth endpoints

ASSUMPTIONS:
- Using sliding window algorithm (not fixed window)
- 100 requests per minute per IP
- Rate limit headers follow RFC 6585

CALLOUTS:
- Redis required in production
- Development mode disables rate limiting
- Consider adjusting limits based on load testing"
```

### PR Callouts

In PR descriptions, highlight:

```markdown
## Callouts

### Assumptions Made
- Assumed UTC timezone for all date calculations
- Using existing User model without modifications

### Trade-offs
- Chose simplicity over performance for v1
- Can be optimized if >1000 concurrent users

### Known Limitations
- Does not support OAuth (planned for v2)
- Rate limiting based on IP only

### Risks
- Database migration required - test in staging first
- Potential breaking change for API consumers using v1
```

## Integration with Other Skills

### With ralph-validation
- Run full validation before commit
- Include validation report in PR description

### With success-criteria
- Commit only when criteria are met
- Reference criteria in commit messages

### With gap-learning
- Document git-related gaps
- Update this skill when patterns emerge

## Common Commands Reference

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Amend last commit message
git commit --amend -m "new message"

# Interactive rebase for cleanup
git rebase -i HEAD~N

# Stash work in progress
git stash push -m "WIP: description"
git stash pop

# Cherry-pick specific commit
git cherry-pick <commit-hash>

# View commit history (concise)
git log --oneline -10

# See what changed in a commit
git show <commit-hash>
```
