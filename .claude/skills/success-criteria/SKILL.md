---
name: success-criteria
description: "Ensures success criteria are explicitly defined and confirmed before starting any task. Prevents wasted effort from unclear requirements."
---

# Success Criteria Definition Skill

This skill enforces explicit success criteria definition before any implementation work begins.

## Purpose

Prevent the #1 cause of wasted AI coding effort: unclear or misaligned requirements.

## Activation Triggers

This skill MUST be invoked when:
- Starting any new feature implementation
- Beginning bug fixes (beyond trivial one-liners)
- Starting refactoring work
- Creating new files or modules
- Any task that will take >5 minutes

## The Success Criteria Framework

### Step 1: Gather Requirements

Ask clarifying questions to understand:

```markdown
## Requirements Checklist

### Functional Requirements
- [ ] What should the feature DO?
- [ ] What inputs does it accept?
- [ ] What outputs should it produce?
- [ ] What errors should it handle?

### Non-Functional Requirements
- [ ] Performance expectations?
- [ ] Security considerations?
- [ ] Accessibility requirements?
- [ ] Compatibility constraints?

### Integration Requirements
- [ ] What existing code does this touch?
- [ ] What depends on this code?
- [ ] Are there API contracts to maintain?

### Testing Requirements
- [ ] What test coverage is expected?
- [ ] Are there specific test cases required?
- [ ] Integration test requirements?
```

### Step 2: Define Measurable Criteria

Transform requirements into measurable success criteria:

```markdown
## Success Criteria for [Task Name]

### Must Have (Required for completion)
1. [ ] [Specific, measurable criterion]
2. [ ] [Specific, measurable criterion]
3. [ ] [Specific, measurable criterion]

### Should Have (Expected unless blocked)
4. [ ] [Specific, measurable criterion]
5. [ ] [Specific, measurable criterion]

### Nice to Have (If time permits)
6. [ ] [Specific, measurable criterion]

### Verification Method
For each criterion, specify HOW it will be verified:
- Criterion 1: [Automated test / Manual check / Command output]
- Criterion 2: [Automated test / Manual check / Command output]
...
```

### Step 3: User Confirmation

ALWAYS confirm criteria with user before proceeding:

```markdown
## Confirmation Request

I've defined the following success criteria for [task]:

**Must Have:**
1. [Criterion 1]
2. [Criterion 2]

**Should Have:**
3. [Criterion 3]

**Verification Plan:**
- [How each will be verified]

**Estimated Scope:**
- Files to modify: [list]
- New files: [list]
- Estimated time: [estimate]

**Questions/Assumptions:**
- [Any assumptions I'm making]
- [Any ambiguities I need clarified]

Please confirm these criteria are correct before I proceed, or let me know what should change.
```

### Step 4: Lock Criteria

Once confirmed, criteria become the "contract":
- Do not expand scope without explicit approval
- Do not reduce scope without explicit acknowledgment
- Reference criteria throughout implementation
- Use criteria for final validation

## Criteria Quality Guidelines

### Good Criteria Examples

```markdown
✅ "API endpoint returns 200 with valid JSON matching UserSchema"
✅ "Function handles null input without throwing, returns empty array"
✅ "Page loads in under 2 seconds with Lighthouse score >90"
✅ "All 15 existing unit tests continue to pass"
✅ "New code has >80% test coverage per Jest report"
```

### Bad Criteria Examples

```markdown
❌ "Code should be clean" (subjective, not measurable)
❌ "Feature should work correctly" (vague, not specific)
❌ "Make it fast" (not quantified)
❌ "Handle edge cases" (which ones?)
❌ "Follow best practices" (which practices?)
```

## Handling Unclear Requirements

When requirements are genuinely unclear:

1. **State assumptions explicitly**
   ```markdown
   Assumption: "User authentication" means email/password login only,
   not OAuth. I'll proceed with this assumption unless corrected.
   ```

2. **Offer options for ambiguous choices**
   ```markdown
   For date formatting, I can use:
   A) ISO 8601 (2024-01-15T10:30:00Z) - best for APIs
   B) Locale-aware (Jan 15, 2024) - best for display

   Which do you prefer?
   ```

3. **Document unknowns**
   ```markdown
   Unknown: Error message content not specified.
   I'll use generic technical messages and they can be refined in a follow-up.
   ```

## Integration with RALPH

After defining success criteria, they feed directly into RALPH validation:
- Each "Must Have" criterion → Required validation check
- Each "Should Have" criterion → Warning-level check
- Each "Nice to Have" → Optional enhancement verification

## Output Format

Always output criteria in this format for consistency:

```markdown
---
TASK: [Task name]
CONFIRMED: [Yes/Pending]
---

MUST_HAVE:
  - criterion: "[Description]"
    verification: "[How to verify]"

SHOULD_HAVE:
  - criterion: "[Description]"
    verification: "[How to verify]"

ASSUMPTIONS:
  - "[Assumption 1]"

UNKNOWNS:
  - "[Unknown 1]"

ESTIMATED_SCOPE:
  files_modified: [N]
  files_created: [N]
  estimated_time: "[estimate]"
---
```
