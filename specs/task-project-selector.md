# Spec: Add Project Selector to New Task Modal

**Task ID:** 2e570840-c232-4084-8d6c-64e7cbcbb4e2
**Branch:** feat/task-project-selector

## Overview

Add a searchable project dropdown to the New Task modal. When creating a task, users select an active project from a dropdown. The selected project's ID is written to the `project_id` field on the tasks record.

## Pre-read Files

Read these files before generating any code:

- `src/components/NewTaskModal.tsx` — the modal to modify
- `src/app/api/tasks/actions/route.ts` — the API route that creates tasks (plan action)
- `src/app/api/projects/route.ts` — existing projects API (used to fetch active projects)
- `src/types/projects.ts` — Project interface
- `.baker-street.json` — framework instructions (CRITICAL)

## Database Context

- `tasks` table has a `project_id` column (uuid FK to `projects.id`, NOT NULL)
- `projects` table has `id`, `name`, `is_active`, etc.
- The `/api/projects?active=true` endpoint already returns active projects

## Files to Modify

### FILE 1: `src/components/NewTaskModal.tsx` (MODIFY)

**Add a project selector field** between the Description and Type fields.

**Behavior:**
- On modal open, fetch active projects from `/api/projects?active=true`
- Display a custom searchable dropdown (NO external dependencies — build with plain HTML/React)
- Dropdown shows project names sorted alphabetically
- Each option shows the project's color dot (4px circle) + name
- User can type to filter the project list
- Selecting a project stores its `id` in component state
- Project selection is **required** — show validation error if not selected
- If only 1 active project exists, auto-select it

**UI Design:**
- Label: "Project" with red asterisk (required, same style as Title label)
- Input field: looks like a text input but opens a dropdown on click/focus
- Search: filter as user types in the input
- Dropdown: positioned below the input, max-height 200px with overflow scroll
- Each dropdown item: `[color dot] Project Name` with hover highlight
- Selected state: input shows the project name, with a small X button to clear
- Same input styling as other fields in the modal (border-zinc-300, dark mode, focus:ring-amber-500)

**DO NOT use any external component library.** Build the dropdown with divs, state, and refs.

### FILE 2: `src/app/api/tasks/actions/route.ts` (MODIFY)

In the `plan` case (around line 33), add `project_id` to the insert:

**Current:**
```typescript
const { data: task, error: taskError } = await supabaseAdmin
  .from("tasks")
  .insert({
    name: payload.name,
    description: payload.description || null,
    task_type: payload.task_type || "feature",
    github_repo: "rob-hoeller/sherlock-dashboard",
    status: "planning",
  })
```

**Change to:**
```typescript
const { data: task, error: taskError } = await supabaseAdmin
  .from("tasks")
  .insert({
    name: payload.name,
    description: payload.description || null,
    task_type: payload.task_type || "feature",
    github_repo: "rob-hoeller/sherlock-dashboard",
    status: "planning",
    project_id: payload.project_id,
  })
```

**Validation:** Add a check before the insert:
```typescript
if (!payload?.project_id) {
  return NextResponse.json({ error: "payload.project_id is required for plan action" }, { status: 400 });
}
```

## Styling Rules

- All colors use zinc palette (dark mode via `dark:` prefix)
- Accent color: amber-500 for focus rings
- Dropdown background: white / dark:zinc-800
- Dropdown border: zinc-300 / dark:zinc-600
- Hover item: zinc-100 / dark:zinc-700
- Selected item highlight: amber-50 / dark:amber-900/20
- Color dots: 10px × 10px rounded-full with the project's color
- Match existing input field styling exactly

## DO NOT

- Do NOT install or import any external dropdown/select library
- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT use `.from<Type>()` Supabase generics
- Do NOT change any other files besides NewTaskModal.tsx and actions/route.ts
