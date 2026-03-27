# Spec: Add Project Name to Task Card

**Task ID:** 5f129b9a-af94-42b7-9bb4-93642048206c
**Branch:** feat/task-card-project-name

## Overview

Show the project name and a color accent bar on each task card in the Tasks page. The project name appears below the task name and above the branch name, in a smaller, faded font. A color bar matching the project's color appears on the left edge of the card.

## Pre-read Files

Read these files before generating any code:

- `src/types/tasks.ts` — Task interface (needs project_id + project fields)
- `src/app/api/tasks/route.ts` — Tasks GET endpoint (needs to include project data)
- `src/app/tasks/page.tsx` — TaskCard component (needs project display)
- `src/app/projects/page.tsx` — Reference for color bar pattern
- `.baker-street.json` — Framework instructions (CRITICAL)

## Database Context

- `tasks` table has `project_id` column (uuid FK to `projects.id`)
- `projects` table has `id`, `name`, `color` (hex string like "#3B82F6"), `is_active`, etc.
- PostgREST can embed related data: `project:projects!project_id(id,name,color)`

**IMPORTANT:** When multiple foreign keys exist between tables, PostgREST requires explicit FK naming with `!column_name` syntax. Use `project:projects!project_id(id,name,color)` — NOT `project:projects(id,name,color)`.

## Files to Modify

### FILE 1: `src/types/tasks.ts` (MODIFY)

Add `project_id` and an optional embedded `project` object to the Task interface:

```typescript
export interface Task {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  task_type: TaskType;
  branch_name: string | null;
  pr_url: string | null;
  pr_number: number | null;
  vercel_preview_url: string | null;
  vercel_deployment_id: string | null;
  github_repo: string;
  blocked_reason: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  project_id: string;
  project?: { id: string; name: string; color: string | null } | null;
}
```

**DO NOT remove or change any existing fields.** Only add `project_id` and `project`.

### FILE 2: `src/app/api/tasks/route.ts` (MODIFY)

In the GET handler, change the select from `"*"` to `"*,project:projects!project_id(id,name,color)"` so each task includes its project data.

**Current:**
```typescript
let query = supabaseAdmin
  .from("tasks")
  .select("*")
  .order("created_at", { ascending: false });
```

**Change to:**
```typescript
let query = supabaseAdmin
  .from("tasks")
  .select("*,project:projects!project_id(id,name,color)")
  .order("created_at", { ascending: false });
```

**DO NOT change anything else in this file.** Only modify the select string.

### FILE 3: `src/app/tasks/page.tsx` (MODIFY)

Modify the `TaskCard` component to add:

1. **Color accent bar** on the left edge of the card using the project's color
2. **Project name** below the task name, above the branch name

**Card layout changes:**
- Add `relative overflow-hidden` to the card's outer div className
- Add a color bar div as the first child inside the card: `<div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.project?.color || "#3B82F6" }} />`
- Add left padding to account for the color bar: change `p-3` to `p-3 pl-4`
- Add project name between the task name and branch name:

```tsx
{task.project?.name && (
  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 truncate">
    {task.project.name}
  </p>
)}
```

This goes immediately after the `</div>` that closes the task name's flex container, and before the `{task.branch_name && ...}` block.

**IMPORTANT:** Project colors are hex strings (e.g., "#3B82F6"). Always use inline `style={{ backgroundColor: ... }}` for color rendering. Do NOT use Tailwind class interpolation like `bg-${color}`.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT use `.from<Type>()` Supabase generics
- Do NOT change any files other than the three listed above
- Do NOT use Tailwind dynamic class names for hex colors — use inline styles
- Do NOT remove existing functionality from any file
