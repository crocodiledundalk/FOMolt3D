---
name: ralph-validation
description: "Retry And Loop for Perfection and Healing - Self-validation cycles with automatic retry on failure. Use for any task requiring quality assurance and iterative improvement."
---

# RALPH: Retry And Loop for Perfection and Healing

This skill implements systematic self-validation with automatic retry cycles to ensure high-quality outputs.

## When to Use

- After completing any significant code change
- Before committing or creating PRs
- When implementing complex features
- For any task with explicit success criteria

## The RALPH Process

### Phase 1: Define Success Criteria

Before executing any task, explicitly define:

```
SUCCESS_CRITERIA:
1. [Specific, measurable criterion 1]
2. [Specific, measurable criterion 2]
3. [Specific, measurable criterion 3]

VALIDATION_COMMANDS:
- [Command to verify criterion 1]
- [Command to verify criterion 2]
- [Command to verify criterion 3]

MAX_RETRIES: 3
```

### Phase 2: Execute with Checkpoints

1. **Pre-flight Check**
   - Verify starting state
   - Ensure all dependencies available
   - Confirm understanding of requirements

2. **Implementation**
   - Work in small, verifiable increments
   - Run validation after each increment
   - Document any deviations or assumptions

3. **Post-implementation Validation**
   - Run ALL validation commands
   - Check each success criterion
   - Generate validation report

### Phase 3: Validation Report Template

```markdown
## RALPH Validation Report

### Task: [Task description]
### Attempt: [N] of [MAX_RETRIES]
### Timestamp: [ISO timestamp]

#### Success Criteria Status:
| Criterion | Status | Evidence |
|-----------|--------|----------|
| [Criterion 1] | PASS/FAIL | [Details] |
| [Criterion 2] | PASS/FAIL | [Details] |
| [Criterion 3] | PASS/FAIL | [Details] |

#### Validation Commands Executed:
- `[command 1]`: [result]
- `[command 2]`: [result]
- `[command 3]`: [result]

#### Overall Status: PASS / FAIL / PARTIAL

#### If FAIL - Retry Analysis:
- **Root Cause**: [Why did it fail?]
- **Correction Strategy**: [What will be different in next attempt?]
- **Confidence Level**: [High/Medium/Low]
```

### Phase 4: Retry Logic

On FAIL:
1. Analyze failure root cause
2. Determine if retry is likely to succeed
3. If MAX_RETRIES not reached AND retry is viable:
   - Apply correction strategy
   - Execute implementation again
   - Generate new validation report
4. If MAX_RETRIES reached OR retry unlikely to help:
   - Escalate to user with full report
   - Provide recommendations for manual intervention

## Validation Types

### Code Validation
```bash
# Syntax and types
npm run typecheck
npm run lint

# Tests
npm run test
npm run test:coverage

# Build verification
npm run build
```

### Behavioral Validation
- Manually verify expected behavior
- Check edge cases identified in requirements
- Verify error handling

### Documentation Validation
- README accurately reflects changes
- API documentation updated
- Inline comments present for complex logic

## Example Usage

```markdown
I'm implementing a new authentication system.

SUCCESS_CRITERIA:
1. Users can login with email/password
2. JWT tokens are generated and validated correctly
3. Protected routes reject unauthenticated requests
4. All existing tests continue to pass
5. New tests cover >80% of auth code

VALIDATION_COMMANDS:
- npm run test -- --grep "auth"
- npm run test:coverage -- --grep "auth"
- curl -X POST /api/login -d '{"email":"test","password":"test"}'
- curl -H "Authorization: Bearer invalid" /api/protected

MAX_RETRIES: 3
```

## Integration with Other Skills

- **gap-learning**: If validation consistently fails due to knowledge gaps, trigger gap-learning skill
- **git-workflow**: Only proceed to commit after RALPH validation passes
- **context-management**: Clear context after successful validation to start fresh

## Anti-Patterns to Avoid

1. **Vague criteria**: "Code should work well" - be specific!
2. **Manual-only validation**: Always include automated checks
3. **Skipping retries**: Don't give up on first failure if fixable
4. **Infinite loops**: Respect MAX_RETRIES limit
5. **Ignoring partial failures**: Investigate before marking as pass

## Output to User

After RALPH validation completes, always provide:
1. Clear PASS/FAIL status
2. Summary of what was validated
3. Any warnings or recommendations
4. Next steps (commit, additional testing, etc.)
