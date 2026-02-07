---
name: prd-builder
description: Interactive PRD (Product Requirements Document) builder that guides users through structured conversations to extract requirements, success criteria, design preferences, and constraints. Produces comprehensive, explicit PRD documents following industry best practices.
---

# PRD Builder Skill

Build thorough Product Requirements Documents through structured conversation, extracting everything needed to define a product or feature completely.

## When to Use

- Starting a new product or major feature
- Formalizing requirements from stakeholder conversations
- Before beginning any significant implementation work
- When requirements are scattered or unclear
- To create alignment between stakeholders before development

---

## The PRD Building Process

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRD BUILDING FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INTAKE          2. DISCOVERY         3. REFINEMENT          │
│  ┌─────────┐       ┌─────────────┐      ┌──────────────┐       │
│  │ Initial │──────▶│ Structured  │─────▶│ Clarify &    │       │
│  │ Prompt  │       │ Questions   │      │ Deep-dive    │       │
│  └─────────┘       └─────────────┘      └──────────────┘       │
│                                                 │               │
│                                                 ▼               │
│  6. DELIVER         5. VALIDATE          4. SYNTHESIZE         │
│  ┌─────────┐       ┌─────────────┐      ┌──────────────┐       │
│  │ Final   │◀──────│ Review &    │◀─────│ Draft PRD    │       │
│  │ PRD     │       │ Iterate     │      │ Sections     │       │
│  └─────────┘       └─────────────┘      └──────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Intake

### 1.1 Receive Initial Input

Accept the user's initial description. This might be:
- A brief idea ("I want to build a task management app")
- A feature request ("Add user authentication to our API")
- A problem statement ("Users are abandoning checkout")
- Existing documentation to formalize

### 1.2 Initial Assessment

Parse the input to identify:

```markdown
## Initial Assessment

### What I Understood
- **Core concept:** [What this product/feature is about]
- **Problem space:** [What problem it solves]
- **Target users:** [Who will use this]
- **Scope indication:** [Small feature / Large feature / Full product]

### What's Missing
- [ ] [Gap 1]
- [ ] [Gap 2]
- [ ] [Gap 3]

### Assumptions I'm Making
- [Assumption 1] - Please confirm or correct
- [Assumption 2] - Please confirm or correct
```

---

## Phase 2: Discovery

### 2.1 The Vision & Problem Space

**Ask these questions to establish context:**

```markdown
## Understanding the Vision

1. **The Problem**
   - What specific problem does this solve?
   - Who experiences this problem?
   - How are they currently solving it (if at all)?
   - What's the cost of NOT solving it?

2. **The Vision**
   - What does success look like in 6 months? 1 year?
   - How will you know this succeeded?
   - What's the one thing this MUST do well?

3. **The Users**
   - Who is the primary user?
   - Are there secondary users?
   - What do we know about their technical sophistication?
   - What context will they be using this in?
```

### 2.2 Functional Requirements

**Extract what the product must DO:**

```markdown
## Functional Requirements Discovery

For each capability, I need to understand:

### Core Functionality
1. **[Capability Name]**
   - What exactly should happen?
   - What triggers this?
   - What's the expected outcome?
   - Are there variations or edge cases?

### User Workflows
- What's the primary user journey?
- What are the entry points?
- What are the exit points / completion states?
- What happens if the user abandons mid-flow?

### Data Requirements
- What data needs to be captured?
- What data needs to be displayed?
- What data relationships exist?
- What data validation is required?

### Integration Points
- What other systems does this interact with?
- What APIs are consumed?
- What APIs are exposed?
- What events/webhooks are needed?
```

### 2.3 Non-Functional Requirements

**Extract quality attributes:**

```markdown
## Non-Functional Requirements Discovery

### Performance
- Expected response times? (e.g., <200ms for API calls)
- Expected throughput? (e.g., 1000 requests/second)
- Acceptable latency?
- Data volume expectations?

### Scalability
- Expected user count at launch?
- Growth projections?
- Peak load scenarios?
- Geographic distribution?

### Reliability
- Uptime requirements? (99.9%? 99.99%?)
- Acceptable downtime windows?
- Disaster recovery needs?
- Backup requirements?

### Security
- Authentication requirements?
- Authorization model?
- Data sensitivity/classification?
- Compliance requirements (GDPR, SOC2, HIPAA)?
- Audit logging needs?

### Accessibility
- WCAG compliance level?
- Supported assistive technologies?
- Internationalization needs?

### Compatibility
- Supported browsers/platforms?
- Mobile requirements?
- Offline capabilities?
- Backward compatibility needs?
```

### 2.4 Success Criteria

**Define measurable outcomes:**

```markdown
## Success Criteria Discovery

### Business Metrics
- What KPIs will this impact?
- What's the target improvement?
- How will we measure success?
- What's the timeline for these metrics?

### User Metrics
- What user behaviors indicate success?
- Target adoption rate?
- Target engagement metrics?
- Acceptable churn/abandonment rate?

### Technical Metrics
- Performance benchmarks?
- Error rate thresholds?
- Test coverage requirements?

### Launch Criteria
- What must be true to launch?
- What can be deferred to v1.1?
- Who needs to sign off?
```

### 2.5 Design Preferences & Choices

**Understand desired approaches:**

```markdown
## Design Preferences Discovery

### Technical Preferences
- Preferred technology stack?
- Existing systems to integrate with?
- Architectural preferences (monolith, microservices, serverless)?
- Coding standards or patterns to follow?

### UX Preferences
- Design system or brand guidelines?
- Reference products to emulate?
- Interaction patterns preferred?
- Tone and voice for messaging?

### Process Preferences
- Iterative delivery or big bang?
- Feature flagging approach?
- Testing strategy preference?
- Documentation expectations?

### Trade-off Preferences
When we must choose between:
- Speed vs. Quality: [preference]
- Features vs. Polish: [preference]
- Build vs. Buy: [preference]
- Customization vs. Standardization: [preference]
```

### 2.6 Constraints & Limitations

**CRITICAL: What NOT to do:**

```markdown
## Constraints & Limitations Discovery

### Hard Constraints
Things that MUST NOT happen:

- **Technical constraints:**
  - Technologies we cannot use?
  - Systems we cannot modify?
  - Data we cannot access?

- **Business constraints:**
  - Budget limitations?
  - Timeline constraints?
  - Resource constraints?
  - Legal/regulatory limitations?

- **Organizational constraints:**
  - Approvals required?
  - Stakeholders to avoid disrupting?
  - Political considerations?

### Explicit "Do NOT Do" List
- DO NOT [specific thing to avoid]
- DO NOT [specific thing to avoid]
- DO NOT [specific thing to avoid]

### Out of Scope
Explicitly excluded from this effort:
- [Out of scope item 1]
- [Out of scope item 2]
- [Out of scope item 3]

### Anti-patterns to Avoid
Based on past experience or preferences:
- [Anti-pattern 1]
- [Anti-pattern 2]
```

---

## Phase 3: Refinement

### 3.1 Deep-Dive Questions

For each area that needs more clarity, probe deeper:

```markdown
## Clarification: [Topic]

You mentioned [X]. I need to understand this better:

1. [Specific question]
2. [Specific question]
3. [Specific question]

**My current understanding:** [summary]
**Is this correct?** If not, please clarify.
```

### 3.2 Scenario Exploration

```markdown
## Scenario: [Name]

Let's walk through a specific scenario:

**Setup:** [Context]
**Actor:** [Who is doing this]
**Goal:** [What they want to achieve]

Step 1: [User does X]
- What should happen?
- What if [edge case]?

Step 2: [System responds with Y]
- Is this the right response?
- What variations exist?

[Continue through scenario...]

**End state:** [Expected outcome]
**Success indicators:** [How we know it worked]
```

### 3.3 Priority Clarification

```markdown
## Priority Check

I've identified these items. Please rank them:

### Must Have (P0) - Cannot launch without
- [ ] [Item]
- [ ] [Item]

### Should Have (P1) - Strongly expected
- [ ] [Item]
- [ ] [Item]

### Nice to Have (P2) - If time permits
- [ ] [Item]
- [ ] [Item]

### Future (P3) - Out of scope but noted
- [ ] [Item]
- [ ] [Item]

**Do you agree with this prioritization?**
```

---

## Phase 4: Synthesize

### 4.1 Draft Structure

Organize all gathered information into PRD sections.

---

## Phase 5: Validate

### 5.1 Review Checklist

```markdown
## PRD Completeness Check

### Vision & Context
- [ ] Problem statement is clear
- [ ] Target users are defined
- [ ] Success vision is articulated
- [ ] Business value is explained

### Requirements
- [ ] All functional requirements documented
- [ ] Non-functional requirements specified
- [ ] User stories/scenarios included
- [ ] Edge cases addressed

### Success Criteria
- [ ] Metrics are defined
- [ ] Targets are set
- [ ] Measurement approach is clear
- [ ] Launch criteria specified

### Constraints
- [ ] Technical constraints documented
- [ ] Business constraints documented
- [ ] Out of scope is explicit
- [ ] "Do NOT do" list is complete

### Design
- [ ] Preferences captured
- [ ] Trade-offs documented
- [ ] Open questions flagged

### Stakeholder Alignment
- [ ] All stakeholders identified
- [ ] Sign-off requirements clear
- [ ] Communication plan noted
```

---

## Phase 6: Deliver

### PRD Template

Generate the final PRD in this format:

```markdown
# Product Requirements Document

## Document Info
| Field | Value |
|-------|-------|
| **Product/Feature** | [Name] |
| **Author** | [Name] |
| **Created** | [Date] |
| **Last Updated** | [Date] |
| **Status** | Draft / In Review / Approved |
| **Version** | 1.0 |

## Approvals
| Role | Name | Status | Date |
|------|------|--------|------|
| Product Owner | | Pending | |
| Tech Lead | | Pending | |
| [Other] | | Pending | |

---

## Executive Summary

### Problem Statement
[2-3 sentences describing the problem this solves]

### Proposed Solution
[2-3 sentences describing the solution approach]

### Success Metrics
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| [Metric 1] | [baseline] | [target] | [when] |
| [Metric 2] | [baseline] | [target] | [when] |

### Key Dates
| Milestone | Date |
|-----------|------|
| PRD Approved | |
| Development Start | |
| Alpha/Internal | |
| Beta/Limited | |
| General Availability | |

---

## Background & Context

### Problem Description
[Detailed description of the problem space]

### Current State
[How things work today, pain points]

### User Impact
[How users are affected by this problem]

### Business Impact
[Business cost of not solving this]

### Prior Art
[Previous attempts, competitor solutions, relevant research]

---

## Goals & Non-Goals

### Goals
What this project WILL accomplish:

1. **[Goal 1]**
   - Description: [details]
   - Metric: [how we measure]
   - Target: [success threshold]

2. **[Goal 2]**
   - Description: [details]
   - Metric: [how we measure]
   - Target: [success threshold]

### Non-Goals
What this project will NOT accomplish:

1. **[Non-Goal 1]** - [Why it's out of scope]
2. **[Non-Goal 2]** - [Why it's out of scope]

---

## Users & Stakeholders

### Primary Users
| User Type | Description | Needs | Volume |
|-----------|-------------|-------|--------|
| [Type 1] | [Who they are] | [What they need] | [How many] |

### Secondary Users
| User Type | Description | Needs | Volume |
|-----------|-------------|-------|--------|
| [Type 1] | [Who they are] | [What they need] | [How many] |

### Stakeholders
| Stakeholder | Interest | Involvement |
|-------------|----------|-------------|
| [Name/Role] | [What they care about] | [How they're involved] |

---

## User Stories & Scenarios

### User Story 1: [Title]
**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Scenario:**
1. Given [context]
2. When [action]
3. Then [outcome]

### User Story 2: [Title]
[...]

---

## Functional Requirements

### FR-1: [Requirement Name]
| Field | Value |
|-------|-------|
| **Priority** | P0 / P1 / P2 |
| **Description** | [Detailed description] |
| **Rationale** | [Why this is needed] |
| **Acceptance Criteria** | [How to verify] |
| **Dependencies** | [What this depends on] |

### FR-2: [Requirement Name]
[...]

---

## Non-Functional Requirements

### Performance
| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| Response Time | [e.g., <200ms p95] | [Why] |
| Throughput | [e.g., 1000 rps] | [Why] |
| Availability | [e.g., 99.9%] | [Why] |

### Security
| Requirement | Description | Compliance |
|-------------|-------------|------------|
| Authentication | [Details] | [Standard] |
| Authorization | [Details] | [Standard] |
| Data Protection | [Details] | [Standard] |

### Scalability
| Dimension | Current | Target | Timeline |
|-----------|---------|--------|----------|
| Users | [current] | [target] | [when] |
| Data | [current] | [target] | [when] |
| Requests | [current] | [target] | [when] |

### Compatibility
| Platform/System | Version | Notes |
|-----------------|---------|-------|
| [Platform 1] | [version] | [notes] |

---

## Design & UX

### Design Principles
1. [Principle 1]
2. [Principle 2]

### Key Screens/Flows
[Link to designs or describe key interfaces]

### Interaction Patterns
[Describe key interaction patterns]

---

## Technical Approach

### Architecture Overview
[High-level architecture description or diagram reference]

### Technology Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | [tech] | [why] |
| Backend | [tech] | [why] |
| Database | [tech] | [why] |
| Infrastructure | [tech] | [why] |

### Integration Points
| System | Direction | Protocol | Purpose |
|--------|-----------|----------|---------|
| [System 1] | Inbound/Outbound | [protocol] | [purpose] |

### Data Model
[Key entities and relationships]

---

## Success Criteria

### Launch Criteria (Must be true to ship)
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Success Metrics (Post-launch)
| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| [Metric 1] | [current] | [target] | [how measured] |

### Quality Gates
| Gate | Requirement | Owner |
|------|-------------|-------|
| Code Review | 100% coverage | Dev Team |
| Testing | [coverage %] | QA |
| Security | No critical issues | Security |
| Performance | Meets benchmarks | Dev Team |

---

## Constraints & Limitations

### Technical Constraints
| Constraint | Impact | Mitigation |
|------------|--------|------------|
| [Constraint 1] | [Impact] | [How we handle] |

### Business Constraints
| Constraint | Impact | Mitigation |
|------------|--------|------------|
| [Constraint 1] | [Impact] | [How we handle] |

### Regulatory Constraints
| Regulation | Requirement | Compliance Approach |
|------------|-------------|---------------------|
| [Regulation] | [What's required] | [How we comply] |

---

## What We Are NOT Doing

**Explicit exclusions from this project:**

1. **[Exclusion 1]**
   - Why excluded: [reason]
   - Future consideration: [yes/no]

2. **[Exclusion 2]**
   - Why excluded: [reason]
   - Future consideration: [yes/no]

**Anti-patterns to avoid:**

1. **DO NOT** [specific thing to avoid] because [reason]
2. **DO NOT** [specific thing to avoid] because [reason]

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] | [Who] |
| [Risk 2] | High/Med/Low | High/Med/Low | [Strategy] | [Who] |

---

## Dependencies

### External Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|------------|-------|--------|-----------------|
| [Dependency 1] | [Team/Person] | [Status] | [Impact] |

### Internal Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|------------|-------|--------|-----------------|
| [Dependency 1] | [Team/Person] | [Status] | [Impact] |

---

## Timeline & Milestones

| Phase | Milestone | Target Date | Exit Criteria |
|-------|-----------|-------------|---------------|
| Planning | PRD Approved | [date] | Stakeholder sign-off |
| Design | Designs Complete | [date] | Design review passed |
| Development | Alpha Ready | [date] | Core functionality working |
| Testing | Beta Ready | [date] | QA sign-off |
| Launch | GA | [date] | Launch criteria met |

---

## Open Questions

| ID | Question | Owner | Due Date | Status |
|----|----------|-------|----------|--------|
| Q1 | [Question] | [Who should answer] | [When needed] | Open |
| Q2 | [Question] | [Who should answer] | [When needed] | Open |

---

## Appendix

### Glossary
| Term | Definition |
|------|------------|
| [Term 1] | [Definition] |

### References
- [Reference 1]
- [Reference 2]

### Change Log
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [date] | [author] | Initial draft |
```

---

## Conversation Patterns

### Opening
```
I'll help you build a comprehensive PRD. Let's start with the basics:

1. **In one sentence, what are you trying to build?**
2. **What problem does this solve, and for whom?**
3. **Is this a new product, a feature, or an enhancement?**

Take your time - the more context you provide upfront, the better the PRD.
```

### Probing for Clarity
```
You mentioned [X]. I want to make sure I understand this correctly:

- When you say [term], do you mean [interpretation A] or [interpretation B]?
- Can you give me an example of [scenario]?
- What happens if [edge case]?

This will help me capture the requirement precisely.
```

### Exploring Trade-offs
```
I see a potential trade-off here:

**Option A:** [Description]
- Pro: [benefit]
- Con: [drawback]

**Option B:** [Description]
- Pro: [benefit]
- Con: [drawback]

Which direction do you prefer, or is there a third option I'm missing?
```

### Confirming Understanding
```
Let me summarize what I've captured so far:

**The Problem:** [summary]
**The Solution:** [summary]
**Key Requirements:** [summary]
**Success Looks Like:** [summary]

Is this accurate? What did I miss or misunderstand?
```

### Identifying Gaps
```
I think we have good coverage on [areas], but I'm noticing gaps in:

1. **[Gap area 1]:** We haven't discussed [specifics]
2. **[Gap area 2]:** I'm unclear on [specifics]

Should we dig into these now, or are they out of scope?
```

### Wrapping Up
```
I believe I have enough information to draft the PRD. Before I do:

1. **Anything else I should know?**
2. **Anyone else I should talk to?**
3. **Any documents I should reference?**

I'll create the draft and then we can review it together.
```

---

## Quality Checklist for PRDs

### Clarity
- [ ] Could a new team member understand this?
- [ ] Are there ambiguous terms that need definition?
- [ ] Are examples provided for complex concepts?

### Completeness
- [ ] All functional requirements documented?
- [ ] All non-functional requirements documented?
- [ ] Success criteria defined and measurable?
- [ ] Constraints and limitations explicit?
- [ ] Out of scope clearly stated?

### Consistency
- [ ] No conflicting requirements?
- [ ] Terminology used consistently?
- [ ] Priorities aligned across sections?

### Feasibility
- [ ] Requirements technically achievable?
- [ ] Timeline realistic?
- [ ] Resources available?
- [ ] Dependencies identified and manageable?

### Testability
- [ ] All requirements verifiable?
- [ ] Acceptance criteria specific enough to test?
- [ ] Success metrics measurable?

---

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `success-criteria` | PRD success criteria flow into implementation criteria |
| `project-planning` | PRD feeds into project planning and CLAUDE.md generation |
| `todo-management` | PRD requirements become task breakdowns |
| `ralph-validation` | PRD acceptance criteria become validation checks |
