# Spec: Add Deep Link Support to Tasks Page

**Task ID:** 44426bf0-9117-4773-9a4c-2a08fff213df
**Branch:** feat/deep-link-tasks

## Overview

Support URL query parameters on the Tasks page so that `?task=<id>` auto-opens the task detail panel for that specific task.

## Pre-read Files

- `src/app/tasks/page.tsx` — The Tasks page with selectedTaskId state
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Modify

### FILE 1: `src/app/tasks/page.tsx` (MODIFY)

**1. Add imports:**
Add `useSearchParams` and `useRouter` from `next/navigation` to the existing imports. These may already be imported — check before adding duplicates.

**2. Initialize hooks:**
Inside the main component function, after the existing state declarations, add:
```typescript
const searchParams = useSearchParams();
const router = useRouter();
```
Note: `useRouter` may already be imported/used. Only add if missing.

**3. Read task param on mount:**
Add a useEffect that reads the `task` query parameter and sets the selected task:
```typescript
useEffect(() => {
  const taskParam = searchParams.get("task");
  if (taskParam) {
    setSelectedTaskId(taskParam);
  }
}, [searchParams]);
```

**4. Update URL on task select:**
Find where `setSelectedTaskId` is called when a task is clicked (in the TaskCard onClick and any other places). After setting the state, also update the URL. The cleanest approach: create a wrapper function:

```typescript
const selectTask = (taskId: string | null) => {
  setSelectedTaskId(taskId);
  const url = new URL(window.location.href);
  if (taskId) {
    url.searchParams.set("task", taskId);
  } else {
    url.searchParams.delete("task");
  }
  window.history.replaceState({}, "", url.toString());
};
```

Then replace all `setSelectedTaskId(...)` calls with `selectTask(...)` — including the TaskCard onClick handler and the TaskDetailPanel onClose handler.

**IMPORTANT:** Use `window.history.replaceState` rather than `router.push` to avoid full page re-renders. The detail panel is client-side state — we just want the URL to reflect it.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than `src/app/tasks/page.tsx`
- Do NOT use `router.push` for URL updates — use `window.history.replaceState`
- Do NOT remove existing functionality
