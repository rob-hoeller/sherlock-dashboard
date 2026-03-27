# Spec: Add Project Name to Task Detail Panel

**Task ID:** 00f8c414-5b31-41b5-bb7c-17b46fb3a77e
**Branch:** feat/task-detail-panel-project

## Overview

Add the project name and a color bar to the task detail panel. The project name appears below the task name in smaller, muted font. A color bar spans the top of the panel matching the project color.

## Pre-read Files

- `src/components/TaskDetailPanel.tsx` — The detail panel to modify
- `src/types/tasks.ts` — Task and TaskDetail interfaces (already have project data from previous task)
- `.baker-street.json` — Framework instructions (CRITICAL)

## Context

The Task interface already includes `project?: { id: string; name: string; color: string | null } | null` from the previous task (Add Project Name to Task Cards). The tasks API already joins project data. No type or API changes are needed.

## Files to Modify

### FILE 1: `src/components/TaskDetailPanel.tsx` (MODIFY)

Two visual additions:

**1. Color bar at top of panel**

Inside the panel div (the one with className containing `absolute right-0 top-0 h-full`), add a color bar as the first child, before the header div:

```tsx
{detail?.project?.color && (
  <div
    className="h-1 w-full"
    style={{ backgroundColor: detail.project.color }}
  />
)}
```

This goes immediately after the opening of the panel div (the one with classes `absolute right-0 top-0 h-full w-full md:w-[480px]...`) and before the header div that starts with `<div className="flex items-center justify-between px-4 py-3 border-b...`.

**2. Project name below task name**

In the header area, there is currently:
```tsx
<div className="min-w-0">
  <div className="text-sm text-gray-500 dark:text-gray-400">Task</div>
  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
    {detail?.name || (loading ? "Loading..." : "")}
  </div>
</div>
```

Add the project name after the task name div:
```tsx
<div className="min-w-0">
  <div className="text-sm text-gray-500 dark:text-gray-400">Task</div>
  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
    {detail?.name || (loading ? "Loading..." : "")}
  </div>
  {detail?.project?.name && (
    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
      {detail.project.name}
    </div>
  )}
</div>
```

**IMPORTANT:** Project colors are hex strings (e.g., "#3B82F6"). Always use inline `style={{ backgroundColor: ... }}`. Do NOT use Tailwind class interpolation.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than `src/components/TaskDetailPanel.tsx`
- Do NOT change the Task type or API — project data is already available
- Do NOT remove or alter any existing functionality
