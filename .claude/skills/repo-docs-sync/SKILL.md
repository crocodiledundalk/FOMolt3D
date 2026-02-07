---
name: repo-docs-sync
description: Ensures all documentation (README.md, guides/INDEX.md, reference docs) stays synchronized after any changes to skills, commands, templates, or guides. Use after adding, modifying, or deleting any resource.
---

# Repository Documentation Sync

This skill ensures all documentation in the Claude Code Resource Hub stays synchronized after changes.

## When to Use

- After adding a new skill, command, template, or guide
- After deleting a resource
- After renaming or moving a resource
- After modifying a resource's metadata (name, description, category)
- Before committing any structural changes

## Documents to Update

| Document | Location | Contains |
|----------|----------|----------|
| **README.md** | `/README.md` | Main index with all resources |
| **INDEX.md** | `/guides/INDEX.md` | Detailed documentation index |
| **SKILLS-REFERENCE.md** | `/guides/docs/SKILLS-REFERENCE.md` | Comprehensive skill documentation |
| **COMMANDS-REFERENCE.md** | `/guides/docs/COMMANDS-REFERENCE.md` | Comprehensive command documentation |

---

## Sync Process

### Step 1: Inventory Current Resources

Run these commands to get current counts:

```bash
# Count skills
find skills -name "SKILL.md" | wc -l

# Count commands
ls commands/*.md 2>/dev/null | wc -l

# Count templates
ls guides/templates/CLAUDE-*.md | wc -l

# Count guides
ls guides/docs/*.md | wc -l

# Count hooks
ls hooks/*.sh 2>/dev/null | wc -l
```

### Step 2: Identify Changes

Compare inventory against documentation:

**In README.md, check the Stats section:**
```markdown
## Stats

| Resource | Count |
|----------|-------|
| Skills | [number] |
| Commands | [number] |
| Templates | [number] |
| Hooks | [number] |
| Tools | [number] |
| Guides | [number] |
```

**In INDEX.md, check the Quick Navigation:**
```markdown
| Category | Count | Description |
|----------|-------|-------------|
| [Skills](#skills) | [number] | ... |
| [Commands](#commands) | [number] | ... |
| [Templates](#templates) | [number] | ... |
| [Guides](#guides) | [number] | ... |
```

### Step 3: Update Each Document

#### For Added Resources

**Adding a Skill:**

1. **README.md** - Add to appropriate category table:
   ```markdown
   | [skill-name](skills/category/skill-name/SKILL.md) | Purpose | When to use |
   ```

2. **INDEX.md** - Add to skills section under correct category

3. **SKILLS-REFERENCE.md** - Add full documentation entry with:
   - Purpose
   - When to Use
   - Key capabilities
   - Configuration (if any)
   - Integration with other skills

**Adding a Command:**

1. **README.md** - Add to Commands table:
   ```markdown
   | `/command-name` | Purpose | When to Use |
   ```

2. **INDEX.md** - Add to commands section

3. **COMMANDS-REFERENCE.md** - Add full documentation with:
   - Purpose
   - When to Use
   - What It Does (step by step)
   - Example Usage
   - Example Output
   - Related commands/skills

**Adding a Template:**

1. **README.md** - Add to Templates table:
   ```markdown
   | [CLAUDE-type.md](guides/templates/CLAUDE-type.md) | Best For | Key Features |
   ```

2. **INDEX.md** - Add to templates section

**Adding a Guide:**

1. **README.md** - Add to Documentation table

2. **INDEX.md** - Add to Guides section with description

#### For Deleted Resources

1. Remove all references from README.md
2. Remove all references from INDEX.md
3. Remove from SKILLS-REFERENCE.md or COMMANDS-REFERENCE.md
4. Update counts in Stats sections

#### For Modified Resources

1. Update description/purpose if changed
2. Update links if path changed
3. Update category if moved
4. Verify all cross-references still work

### Step 4: Verify Links

After updates, verify all links work:

```bash
# Check for broken internal links (basic check)
grep -r "](skills/" README.md | grep -v "SKILL.md"
grep -r "](guides/" README.md
grep -r "](commands/" README.md
```

### Step 5: Update Counts

Update all count references:

**README.md Stats section:**
```markdown
## Stats

| Resource | Count |
|----------|-------|
| Skills | [actual count] |
| Commands | [actual count] |
| Templates | [actual count] |
| Hooks | [actual count] |
| Tools | [actual count] |
| Guides | [actual count] |
```

**INDEX.md Quick Navigation:**
```markdown
| [Skills](#skills) | [actual count] | Knowledge bases for specific domains |
| [Commands](#commands) | [actual count] | Slash commands for workflows |
| [Templates](#templates) | [actual count] | CLAUDE.md project templates |
| [Guides](#guides) | [actual count] | How-to documentation |
```

---

## Checklist for Each Change Type

### New Skill Added
- [ ] Added to README.md skills table (correct category)
- [ ] Added to INDEX.md skills section
- [ ] Added to SKILLS-REFERENCE.md with full documentation
- [ ] Updated skill counts in README.md and INDEX.md
- [ ] Verified frontmatter follows structure (use `repo-structure` skill)

### New Command Added
- [ ] Added to README.md commands table
- [ ] Added to INDEX.md commands section
- [ ] Added to COMMANDS-REFERENCE.md with full documentation
- [ ] Updated command count in README.md and INDEX.md

### New Template Added
- [ ] Added to README.md templates table
- [ ] Added to INDEX.md templates section
- [ ] Updated template count in README.md and INDEX.md

### New Guide Added
- [ ] Added to README.md documentation table
- [ ] Added to INDEX.md guides section
- [ ] Updated guide count in README.md and INDEX.md

### Resource Deleted
- [ ] Removed from README.md
- [ ] Removed from INDEX.md
- [ ] Removed from reference docs (SKILLS-REFERENCE.md or COMMANDS-REFERENCE.md)
- [ ] Updated all counts
- [ ] Checked for broken cross-references

### Resource Moved/Renamed
- [ ] Updated all links in README.md
- [ ] Updated all links in INDEX.md
- [ ] Updated all links in reference docs
- [ ] Updated any cross-references in other skills/docs

---

## Automation Helpers

### Quick Count Script
```bash
echo "Skills: $(find skills -name 'SKILL.md' | wc -l)"
echo "Commands: $(ls commands/*.md 2>/dev/null | wc -l)"
echo "Templates: $(ls guides/templates/CLAUDE-*.md 2>/dev/null | wc -l)"
echo "Guides: $(ls guides/docs/*.md 2>/dev/null | wc -l)"
echo "Hooks: $(ls hooks/*.sh 2>/dev/null | wc -l)"
echo "Tools: $(ls -d tools/*/ 2>/dev/null | wc -l)"
```

### List All Skills by Category
```bash
echo "=== General ===" && ls skills/general/*/SKILL.md 2>/dev/null
echo "=== Solana ===" && ls skills/solana/*/SKILL.md 2>/dev/null
echo "=== Web Development ===" && find skills/web-development -name "SKILL.md" 2>/dev/null
echo "=== Marketing ===" && find skills/marketing -name "SKILL.md" 2>/dev/null
```

---

## Common Patterns

### Adding a skill to README.md
```markdown
| [skill-name](skills/category/skill-name/SKILL.md) | Brief purpose | When to use it |
```

### Adding a command to README.md
```markdown
| `/command-name` | Brief purpose | When to use it |
```

### Adding a template to README.md
```markdown
| [CLAUDE-type.md](guides/templates/CLAUDE-type.md) | Best for X | Key features |
```

---

## Final Verification

Before committing documentation changes:

1. [ ] All counts are accurate
2. [ ] All new resources appear in README.md
3. [ ] All new resources appear in INDEX.md
4. [ ] Reference docs updated if skill/command added
5. [ ] No broken links
6. [ ] No orphaned references to deleted resources
