# Spec: Fix Project Name Disappearing on Task Board

**Task ID:** 1760f763-cc37-4fdf-9e26-51f93b7515fa
**Branch:** fix/project-name-disappearing

## Overview

When a task card moves between columns (status change), the project name disappears because the Supabase realtime event payload only contains the raw task row — it does not include the joined project data. The fix preserves the existing project data when handling realtime updates.

## Pre-read Files

- `src/app/tasks/page.tsx` — Contains the realtime subscription and state management
- `.baker-street.json` — Framework instructions (CRITICAL)

## Root Cause

Lines 167-178 of `src/app/tasks/page.tsx` subscribe to Supabase realtime changes on the `tasks` table. On INSERT and UPDATE events, `payload.new` is cast to `Task` and used directly. However, `payload.new` only contains the raw database row — it does NOT include the embedded `project` object from the PostgREST join. This causes the project name and color to disappear until the page is reloaded.

## Files to Modify

### FILE 1: `src/app/tasks/page.tsx` (MODIFY)

Modify the realtime event handler to preserve the existing project data on UPDATE, and to fetch project data on INSERT.

**Current code (around lines 169-175):**
```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
  if (payload.eventType === 'INSERT') {
    setTasks(prev => [payload.new as Task, ...prev]);
  } else if (payload.eventType === 'UPDATE') {
    setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
  } else if (payload.eventType === 'DELETE') {
    setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id));
```

**Replace with:**
```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
  if (payload.eventType === 'INSERT') {
    const newTask = payload.new as Task;
    // Realtime payload doesn't include joined project data — fetch it
    fetch(`/api/tasks`)
      .then(res => res.json())
      .then((data: Task[]) => {
        const freshTask = data.find(t => t.id === newTask.id);
        if (freshTask) {
          setTasks(prev => [freshTask, ...prev.filter(t => t.id !== freshTask.id)]);
        }
      })
      .catch(() => {
        // Fallback: insert without project data, will show on next reload
        setTasks(prev => [newTask, ...prev]);
      });
  } else if (payload.eventType === 'UPDATE') {
    const updated = payload.new as Task;
    // Preserve the existing project data since realtime doesn't include joins
    setTasks(prev => prev.map(t =>
      t.id === updated.id ? { ...updated, project: t.project } : t
    ));
  } else if (payload.eventType === 'DELETE') {
    setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id));
```

**Key changes:**
1. **UPDATE**: Merge `payload.new` with existing task's `project` field using spread: `{ ...updated, project: t.project }`
2. **INSERT**: Fetch the full task list from the API (which includes the project join) to get the complete task data for the new task.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than `src/app/tasks/page.tsx`
- Do NOT change the realtime subscription setup or channel name
- Do NOT alter the DELETE handler
