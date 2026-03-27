# Spec: New Bugfix Tasks Go Directly to Approved Status

**Task ID:** f6cce5f5-1040-4b73-a5ba-5d667cdb9282
**Branch:** feat/bugfix-direct-approved

## Overview

When a user creates a new task with task_type "bugfix", the task should be created directly in "approved" status instead of "planning". An approved action should also be inserted into the task_actions table so the orchestrator picks it up.

## Pre-read Files

- `src/app/api/tasks/actions/route.ts` — The plan action handler that creates tasks
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Modify

### FILE 1: `src/app/api/tasks/actions/route.ts` (MODIFY)

In the `case 'plan':` block, modify the task creation logic to check the task_type:

**Current behavior:** All new tasks are created with `status: "planning"` and a single history record of `null → planning`.

**New behavior:**
- If `payload.task_type === "bugfix"`: create the task with `status: "approved"`. Insert two history records: `null → planning` then `planning → approved`. Insert an additional task_action with `action_type: "approve"`.
- If `payload.task_type === "feature"` (or anything else): existing behavior unchanged — create with `status: "planning"` and one history record.

**Specific changes inside the `case 'plan':` block:**

1. Determine the initial status based on task_type:
```typescript
const isBugfix = (payload.task_type || "feature") === "bugfix";
const initialStatus = isBugfix ? "approved" : "planning";
```

2. Use `initialStatus` instead of the hardcoded `"planning"` in the task insert:
```typescript
status: initialStatus,
```

3. After the existing history insert (which records `null → planning`), add conditional logic for bugfix:
```typescript
if (isBugfix) {
  // Record auto-approval in history
  await supabaseAdmin.from("task_history").insert({
    task_id: taskId,
    previous_status: "planning",
    new_status: "approved",
    changed_by: "system",
    note: "Bug fix tasks are auto-approved",
    user_id: userId,
    user_name: userName,
  });
}
```

4. At the very end of the `case 'plan':` block (after the `break;` is removed or before it), add:
```typescript
if (isBugfix) {
  // Queue approved action for orchestrator
  await supabaseAdmin.from("task_actions").insert({
    task_id: taskId,
    action_type: "approve",
    user_id: userId,
    user_name: "system",
    payload: { auto_approved: true },
  });
}
```

**IMPORTANT:** Keep the existing history record for `null → planning` even for bugfix tasks. This maintains the audit trail showing the task was created and then auto-approved.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than `src/app/api/tasks/actions/route.ts`
- Do NOT change the behavior for feature-type tasks
- Do NOT remove or alter any existing code paths — only add conditional logic
