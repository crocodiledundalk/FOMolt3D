---
name: gemini-integration
description: Orchestrate Google's Gemini CLI for cross-model collaboration. Use when tasks benefit from a second AI perspective, real-time web search via Google, code review from a different model, or parallel code generation. Requires Gemini CLI and GEMINI_API_KEY.
---

# Gemini CLI Integration

Orchestrate Google's Gemini CLI (v0.16.0+) with Gemini 2.5 Pro for code generation, review, analysis, and web research. This enables cross-model collaboration where Claude can leverage Gemini's unique capabilities.

## Prerequisites

### Installation

```bash
npm install -g @google/gemini-cli
```

### Authentication

Set the `GEMINI_API_KEY` environment variable:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

**Alternative auth methods:**
- `GOOGLE_GENAI_USE_VERTEXAI` - For Vertex AI
- `GOOGLE_GENAI_USE_GCA` - For Google Cloud Auth
- Configure in `~/.gemini/settings.json`

### Verify Installation

```bash
gemini --version
```

## When to Use This Skill

### Ideal Use Cases

1. **Second Opinion / Cross-Validation**
   - Code review after writing code (different AI perspective)
   - Security audit with alternative analysis
   - Finding bugs Claude might have missed
   - Validating architectural decisions

2. **Google Search Grounding**
   - Questions requiring current internet information
   - Latest library versions, API changes, documentation updates
   - Current events or recent releases
   - Real-time data that may be beyond Claude's knowledge cutoff

3. **Codebase Architecture Analysis**
   - Use Gemini's `codebase_investigator` tool
   - Understanding unfamiliar codebases
   - Mapping cross-file dependencies

4. **Parallel Processing**
   - Offload tasks while continuing other work
   - Run multiple code generations simultaneously
   - Background documentation generation

5. **Specialized Generation**
   - Test suite generation
   - Documentation generation
   - Code translation between languages

### When NOT to Use

- Simple, quick tasks (overhead not worth it)
- Tasks requiring immediate response (rate limits may cause delays)
- When context is already loaded and understood
- Interactive refinement requiring conversation
- Sensitive data that shouldn't leave the current environment

## Core Command Pattern

```bash
export GEMINI_API_KEY="$GEMINI_API_KEY" && gemini "prompt" --yolo -o text 2>&1
```

### Key Flags

| Flag | Purpose |
|------|---------|
| `--yolo` / `-y` | Auto-approve all tool calls |
| `-o text` | Human-readable output |
| `-o json` | Structured output with stats |
| `-m gemini-2.5-flash` | Use faster model for simple tasks |
| `-m gemini-2.5-pro` | Use full model (default) |

### Critical Behavioral Notes

**YOLO Mode**: Auto-approves tool calls but does NOT prevent planning prompts. Gemini may still present plans and ask "Does this plan look good?" Use forceful language:
- "Apply now"
- "Start immediately"
- "Do this without asking for confirmation"
- "Reply with just the answer"

**Rate Limits** (Free Tier):
- 60 requests/minute
- 1,000 requests/day
- CLI auto-retries with backoff
- Expect messages like "quota will reset after Xs"

## Quick Reference Commands

### Code Review

```bash
gemini "Review this code for bugs and security issues: [paste code or file path]" --yolo -o text 2>&1
```

### Code Generation

```bash
gemini "Create [description] with [features]. Output complete file content only, no explanations." --yolo -o text 2>&1
```

### Bug Fixing

```bash
gemini "Fix these bugs in the following code: [bugs]. Apply fixes and output corrected code only. [code]" --yolo -o text 2>&1
```

### Test Generation

```bash
gemini "Generate Jest tests for this function. Output only the test code: [function]" --yolo -o text 2>&1
```

### Documentation

```bash
gemini "Generate JSDoc comments for all functions in this code. Output as code only: [code]" --yolo -o text 2>&1
```

### Web Search (Real-time Info)

```bash
gemini "What is the latest version of [package]? Use Google Search. Reply concisely." --yolo -o text 2>&1
```

### Architecture Analysis

```bash
gemini "Use codebase_investigator to analyze the architecture of this project" --yolo -o text 2>&1
```

### Faster Model (Simple Tasks)

```bash
gemini "prompt" -m gemini-2.5-flash --yolo -o text 2>&1
```

## Integration Patterns

### Pattern 1: Code Review Cycle

After writing code, get a second opinion:

```bash
# Claude writes code, then asks Gemini to review
gemini "Review this TypeScript code for bugs, security issues, and improvements. Be concise:

[paste code]" --yolo -o text 2>&1
```

### Pattern 2: Research Then Implement

Use Gemini for current web info, then implement:

```bash
# Get current best practices
gemini "What are the current best practices for [topic] in 2025? Use Google Search. List the top 5 points." --yolo -o text 2>&1

# Then Claude implements based on findings
```

### Pattern 3: Parallel Generation

Run Gemini in background for non-blocking work:

```bash
# Start in background
gemini "[long generation task]" --yolo -o text > /tmp/gemini-output.txt 2>&1 &

# Continue with other work, then read results
cat /tmp/gemini-output.txt
```

### Pattern 4: Cross-Validation

Have Gemini validate Claude's work:

```bash
gemini "I'm going to show you a solution to [problem]. Tell me if there are any issues or better approaches:

[Claude's solution]" --yolo -o text 2>&1
```

## Gemini's Unique Capabilities

These tools are available through Gemini that Claude doesn't have:

| Tool | Purpose |
|------|---------|
| `google_web_search` | Real-time internet search via Google |
| `codebase_investigator` | Deep architectural analysis |
| `save_memory` | Cross-session persistent memory |

## Error Handling

### Exit Code 41 - Authentication Error

```
Please set an Auth method in your ~/.gemini/settings.json or specify one of the following environment variables: GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA
```

**Solution:** Ensure `GEMINI_API_KEY` is exported before the command.

### Rate Limit Exceeded

- CLI auto-retries with backoff
- Use `-m gemini-2.5-flash` for lower priority tasks
- Run in background for long operations
- Wait for quota reset

### Command Timeout

For long tasks, increase timeout or run in background:

```bash
timeout 120 gemini "long task" --yolo -o text 2>&1
# or
gemini "long task" --yolo -o text > output.txt 2>&1 &
```

## Output Processing

### JSON Output

For structured output with stats:

```bash
gemini "prompt" --yolo -o json 2>&1
```

Returns:
```json
{
  "response": "actual content",
  "stats": {
    "models": { "tokens": {...} },
    "tools": { "byName": {...} }
  }
}
```

### Extracting Clean Output

The `YOLO mode is enabled` message always appears. To extract just the response:

```bash
gemini "prompt" --yolo -o text 2>&1 | tail -n +2
```

## Configuration

### Project Context

Create `.gemini/GEMINI.md` in project root for persistent context that Gemini will automatically read (similar to CLAUDE.md).

### Session Management

```bash
# List sessions
gemini --list-sessions

# Resume session
echo "follow-up question" | gemini -r [index] -o text
```

## Best Practices

### Do

- Use `--yolo` flag to avoid interactive prompts
- Use `-o text` for human-readable output
- Be explicit in prompts ("Reply with just the code", "Be concise")
- Validate Gemini's output before using
- Use `-m gemini-2.5-flash` for simple tasks to conserve quota

### Don't

- Don't use for tasks requiring back-and-forth conversation
- Don't send sensitive credentials or secrets in prompts
- Don't rely solely on Gemini's output without validation
- Don't ignore rate limits in loops

## Example Workflow

```bash
# 1. Claude writes a function
# ... Claude implements feature ...

# 2. Get Gemini's review
export GEMINI_API_KEY="$GEMINI_API_KEY" && gemini "Review this code for bugs and suggest improvements. Be concise:

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}" --yolo -o text 2>&1

# 3. Gemini identifies the off-by-one error (i <= should be i <)

# 4. Claude fixes based on feedback
```

## Resources

- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [Google AI Studio](https://aistudio.google.com/) - Get API keys
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [npm Package](https://www.npmjs.com/package/@google/gemini-cli)
