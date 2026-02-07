---
name: agent-browser
description: PREFERRED browser automation tool for AI agents. CLI-based headless browser control optimized for LLM interaction. Use for web testing, form automation, screenshots, scraping, and any browser task. Prefer this over playwright-skill for simpler, more direct control.
---

# Agent Browser

A headless browser automation CLI optimized for AI agents. Fast Rust native binary with Node.js fallback. **This is the preferred browser automation tool** - use instead of playwright-skill for most tasks.

## Why Prefer This Over Playwright

| Feature | agent-browser | playwright-skill |
|---------|---------------|------------------|
| Setup | `npm i -g agent-browser && agent-browser install` | Requires skill directory, npm setup |
| Usage | Direct CLI commands | Write JavaScript files |
| AI-Optimized | Refs (@e1, @e2) from snapshots | CSS selectors only |
| Complexity | Simple commands | Full programming required |
| Speed | Rust native binary | Node.js only |

**Use playwright-skill when:** You need complex multi-step scripts, custom JavaScript logic, or Playwright-specific APIs.

## When to Use

- Testing websites and web applications
- Filling forms and submitting data
- Taking screenshots (single or full-page)
- Scraping content and extracting data
- Checking responsive design
- Validating login flows
- Automating any browser interaction
- Quick one-off browser tasks

---

## Installation

```bash
# Install globally
npm install -g agent-browser

# Download browser (Chromium)
agent-browser install

# Linux: include system dependencies
agent-browser install --with-deps
```

## Core Workflow

The fundamental pattern for AI-optimized browser control:

```bash
# 1. Open a page
agent-browser open https://example.com

# 2. Get accessibility snapshot with element refs
agent-browser snapshot

# 3. Interact using refs from snapshot
agent-browser click @e2
agent-browser fill @e3 "my text"

# 4. Get information
agent-browser get text @e1

# 5. Screenshot and close
agent-browser screenshot /tmp/result.png
agent-browser close
```

---

## Command Reference

### Navigation

```bash
agent-browser open <url>           # Navigate to URL
agent-browser back                 # Go back
agent-browser forward              # Go forward
agent-browser reload               # Reload page
```

### Snapshots (AI-Optimized)

```bash
agent-browser snapshot             # Full accessibility tree with refs
agent-browser snapshot -i          # Interactive elements only
agent-browser snapshot -c          # Compact (remove empty elements)
agent-browser snapshot -d 3        # Limit depth to 3 levels
agent-browser snapshot -s "#main"  # Scope to CSS selector
```

The snapshot returns elements with **refs** like `@e1`, `@e2` that you can use directly in subsequent commands without re-querying.

### Clicking & Interaction

```bash
# Using refs (preferred - from snapshot)
agent-browser click @e2
agent-browser dblclick @e5

# Using CSS selectors
agent-browser click "#submit-button"
agent-browser click ".nav-link"

# Using semantic locators
agent-browser find role button click --name "Submit"
agent-browser find label "Email" click
agent-browser find text "Sign Up" click
```

### Text Input

```bash
# Fill (clears first, then types)
agent-browser fill @e3 "hello@example.com"
agent-browser fill "#email" "test@test.com"

# Type (append without clearing)
agent-browser type @e4 "additional text"

# Using semantic find
agent-browser find label "Username" fill "myuser"
agent-browser find placeholder "Enter email" fill "test@example.com"
```

### Keyboard Input

```bash
agent-browser press Enter
agent-browser press Tab
agent-browser press "Control+a"
agent-browser keydown Shift
agent-browser keyup Shift
```

### Form Controls

```bash
agent-browser select @e6 "option-value"    # Select dropdown option
agent-browser check @e7                     # Check checkbox
agent-browser uncheck @e8                   # Uncheck checkbox
agent-browser upload @e9 /path/to/file.pdf  # File upload
```

### Getting Information

```bash
agent-browser get text @e1           # Element text content
agent-browser get html @e1           # Element HTML
agent-browser get value @e3          # Input value
agent-browser get attr @e1 href      # Attribute value
agent-browser get title              # Page title
agent-browser get url                # Current URL
agent-browser get count ".items"     # Count matching elements
agent-browser get box @e1            # Element bounding box
```

### State Checks

```bash
agent-browser is visible @e1
agent-browser is enabled @e2
agent-browser is checked @e3
```

### Waiting

```bash
agent-browser wait @e1                      # Wait for element
agent-browser wait 2000                     # Wait milliseconds
agent-browser wait text "Success"           # Wait for text
agent-browser wait url "**/dashboard"       # Wait for URL pattern
agent-browser wait load networkidle         # Wait for network idle
agent-browser wait js "window.loaded"       # Wait for JS condition
```

### Screenshots

```bash
agent-browser screenshot /tmp/page.png       # Viewport screenshot
agent-browser screenshot /tmp/full.png --full # Full page
```

### Scrolling

```bash
agent-browser scroll down
agent-browser scroll up
agent-browser scroll @e1              # Scroll element into view
agent-browser scroll 0 500            # Scroll to coordinates
```

### Mouse Control

```bash
agent-browser hover @e1
agent-browser mouse move 100 200
agent-browser mouse down
agent-browser mouse up
agent-browser mouse wheel 0 100       # Scroll wheel
agent-browser drag @e1 @e2            # Drag and drop
```

---

## Semantic Finding

Find elements by semantic properties instead of CSS:

```bash
# By ARIA role
agent-browser find role button click
agent-browser find role textbox fill "text"
agent-browser find role link --name "Home" click

# By label text
agent-browser find label "Email Address" fill "test@test.com"

# By placeholder
agent-browser find placeholder "Search..." fill "query"

# By visible text
agent-browser find text "Submit" click

# By alt text (images)
agent-browser find alt "Logo" click

# By title attribute
agent-browser find title "Close" click

# By test ID
agent-browser find testid "submit-btn" click
```

---

## Browser Configuration

### Viewport & Device

```bash
agent-browser set viewport 1920 1080
agent-browser set device "iPhone 12"
agent-browser set device "Pixel 5"
```

### Geolocation & Network

```bash
agent-browser set geo 37.7749 -122.4194    # San Francisco
agent-browser set offline true              # Simulate offline
agent-browser set offline false
```

### Headers & Auth

```bash
agent-browser set headers '{"Authorization": "Bearer token123"}'
agent-browser set credentials username password
```

### Media Features

```bash
agent-browser set media colorScheme dark
agent-browser set media reducedMotion reduce
```

---

## Session Management

Isolate browser state across different tasks:

```bash
# Use named sessions
agent-browser --session test1 open https://site1.com
agent-browser --session test2 open https://site2.com

# Or via environment variable
AGENT_BROWSER_SESSION=mytest agent-browser open https://example.com
```

---

## Storage & Cookies

```bash
# Cookies
agent-browser cookies get
agent-browser cookies set '{"name":"session","value":"abc123"}'
agent-browser cookies clear

# Local/Session Storage
agent-browser storage local get mykey
agent-browser storage local set mykey "value"
agent-browser storage session get key
agent-browser storage session clear
```

---

## Network Control

### Intercept Requests

```bash
# Block requests
agent-browser network route "**/*.png" block
agent-browser network route "**/analytics*" block

# Mock responses
agent-browser network route "**/api/user" mock '{"name":"Test"}'
```

### View Requests

```bash
agent-browser network requests              # All requests
agent-browser network requests --type xhr   # XHR only
agent-browser network requests --status 404 # Failed only
```

---

## Multi-Tab & Windows

```bash
agent-browser tab new                  # Open new tab
agent-browser tab list                 # List tabs
agent-browser tab switch 1             # Switch to tab
agent-browser tab close                # Close current tab

agent-browser window new               # New window
agent-browser frame switch "iframe#id" # Switch to iframe
agent-browser frame main               # Back to main frame
```

---

## Dialogs

```bash
agent-browser dialog accept            # Accept alert/confirm
agent-browser dialog accept "input"    # Accept prompt with text
agent-browser dialog dismiss           # Dismiss/cancel
```

---

## Debugging

```bash
# Visible browser
agent-browser --headed open https://example.com

# Tracing
agent-browser trace start
# ... do actions ...
agent-browser trace stop /tmp/trace.zip

# Console & Errors
agent-browser console                  # View console logs
agent-browser errors                   # View errors

# Highlight elements
agent-browser highlight @e1

# Save/restore state
agent-browser state save /tmp/state.json
agent-browser state load /tmp/state.json
```

---

## Output Formats

```bash
# JSON output (for parsing)
agent-browser --json snapshot
agent-browser --json get text @e1

# Debug output
agent-browser --debug open https://example.com
```

---

## Common Patterns

### Test Login Flow

```bash
agent-browser open https://myapp.com/login
agent-browser snapshot -i
agent-browser find label "Email" fill "test@example.com"
agent-browser find label "Password" fill "secret123"
agent-browser find role button --name "Sign In" click
agent-browser wait url "**/dashboard"
agent-browser screenshot /tmp/logged-in.png
agent-browser close
```

### Fill Contact Form

```bash
agent-browser open https://myapp.com/contact
agent-browser snapshot -i
agent-browser find label "Name" fill "John Doe"
agent-browser find label "Email" fill "john@example.com"
agent-browser find label "Message" fill "Hello, this is a test message."
agent-browser find role button --name "Send" click
agent-browser wait text "Thank you"
agent-browser screenshot /tmp/submitted.png
agent-browser close
```

### Responsive Design Check

```bash
agent-browser open https://myapp.com

# Desktop
agent-browser set viewport 1920 1080
agent-browser screenshot /tmp/desktop.png

# Tablet
agent-browser set viewport 768 1024
agent-browser screenshot /tmp/tablet.png

# Mobile
agent-browser set viewport 375 667
agent-browser screenshot /tmp/mobile.png

agent-browser close
```

### Scrape Table Data

```bash
agent-browser open https://example.com/data
agent-browser snapshot -s "table"
agent-browser --json get text "table"
agent-browser close
```

### Wait for Dynamic Content

```bash
agent-browser open https://spa-app.com
agent-browser wait load networkidle
agent-browser wait text "Welcome"
agent-browser snapshot
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AGENT_BROWSER_SESSION` | Named session for isolation |
| `AGENT_BROWSER_EXECUTABLE_PATH` | Custom browser binary |
| `AGENT_BROWSER_STREAM_PORT` | WebSocket streaming port |

---

## Tips

1. **Always snapshot first** - Get refs before interacting
2. **Use `-i` flag** - Interactive-only snapshots are cleaner for forms
3. **Prefer refs over CSS** - `@e2` is more reliable than brittle selectors
4. **Use semantic find** - `find label "Email"` is more readable than CSS
5. **Wait appropriately** - Use `wait load networkidle` for SPAs
6. **JSON output** - Use `--json` when parsing results programmatically
7. **Sessions for isolation** - Use `--session` for parallel independent tasks

---

## Troubleshooting

**Browser not installed:**
```bash
agent-browser install
```

**Missing Linux dependencies:**
```bash
agent-browser install --with-deps
```

**Element not found:**
- Run `agent-browser snapshot` to see available elements
- Use `-i` flag to see only interactive elements
- Check if element is in iframe: `agent-browser frame switch "iframe"`

**Timeout errors:**
- Add explicit waits: `agent-browser wait @e1`
- Wait for network: `agent-browser wait load networkidle`
