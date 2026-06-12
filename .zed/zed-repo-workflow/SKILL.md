---
name: zed-repo-workflow
description: Repo-local workflow and coding rules for debridgers-repo. Enforces analysis first, approval before edits, concise planning, repo-first pattern matching, and strict TypeScript discipline.
---

# Zed Repo Workflow

Use this skill for work inside `debridgers-repo`.

## Default mode

Operate in analysis mode by default.

- Do not modify files unless the user explicitly approves the plan.
- For questions, answer directly and clearly.
- For requests that involve code changes, file edits, refactors, implementations, or commands with side effects, plan first and wait.

## Required response format before any change

Respond with these sections in this order:

### Plan

- Briefly state what will change
- List the concrete implementation steps

### Files to Change

- List exact project-relative paths

### Risks

- List assumptions, side effects, or unknowns

After this, stop and wait for approval.

Only proceed after the user says `approve`, `go ahead`, `implement`, or clearly equivalent wording.

## Repo-first workflow

Before suggesting or writing code:

- Study the existing codebase and reuse its conventions
- Match existing file structure, naming, imports, exports, and component patterns
- Reuse shared locations for shared code
- Keep app-specific code local when that is the project pattern
- Do not invent a new pattern when an existing one already fits

## Change discipline

- Make only the requested change
- Prefer minimal, surgical edits
- Do not add unrelated features or refactors
- Do not create new files if an existing file is the right place
- Do not overwrite user work outside the approved scope

## TypeScript rules

Read the existing type conventions first and match them.

- Use `interface` for object contracts when that matches project style
- Use `type` for unions, intersections, aliases, mapped types, and conditional types
- Avoid `any`
- Prefer `unknown` and narrow it when needed
- Let inference work when the type is obvious
- Add explicit return types for non-trivial functions
- Always add explicit return types for custom hooks
- Export shared types from the correct public entry point
- Do not duplicate the same type in multiple places

## Comment style

For top-level section dividers, use this exact format:

```ts
// === Types
// === Helpers
// === Events
// === Tests
```

Rules:

- No decorative separators
- Use regular `//` comments only when they explain non-obvious intent or constraints
- Do not add comments that merely restate what the code does

## Response style

- Keep responses concise, practical, and scannable
- Prefer bullets over long paragraphs
- Ask clarifying questions only when necessary
- Be explicit about assumptions and risks

## Markdown and prose style

- Do not use the em dash character
- Keep wording direct and specific
- Prefer short bullets over long explanations

## After implementation

Once work is complete:

- Summarize what changed and why
- List the files changed
- State what validation was run, or why validation was not run
- Mention any concrete follow-up steps if relevant

## Scope

This skill is intended for local use inside this repository and should guide all future implementation work unless the user gives instructions that override it.
