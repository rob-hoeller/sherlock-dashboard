# Spec: Remove the Core Files Page

**Task ID:** 56dda298-0dc4-47fc-bf7f-e82e0015651d
**Branch:** feat/remove-core-files-page

## Overview

Remove the Core Files page from the application. Delete the page component and remove its navigation entry from the sidebar.

## Pre-read Files

Read these files before generating any code:

- `src/components/Sidebar.tsx` — Contains the nav array with the Core Files entry
- `src/app/core/page.tsx` — The page to be deleted
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Modify

### FILE 1: `src/components/Sidebar.tsx` (MODIFY)

Remove the Core Files entry from the `nav` array. The entry to remove is:

```typescript
{ href: "/core", label: "Core Files", icon: Settings },
```

Also remove the `Settings` import from the lucide-react import line, since it will no longer be used after removing this nav entry.

**Current nav array:**
```typescript
export const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/core", label: "Core Files", icon: Settings },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
];
```

**After modification:**
```typescript
export const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
];
```

**DO NOT change anything else in this file.**

### FILE 2: `src/app/core/page.tsx` (DELETE)

Delete this file entirely.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than the two listed above
- Do NOT remove any other nav entries or pages
