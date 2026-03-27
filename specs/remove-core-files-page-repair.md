# Repair Spec: Remove the Core Files Page

**Task ID:** 56dda298-0dc4-47fc-bf7f-e82e0015651d
**Branch:** feat/remove-core-files-page
**Attempt:** 2 of 3

## What went wrong
The coder tried to modify src/app/core/page.tsx instead of deleting it. The coder does not support file deletion.

## Revised approach
Only modify the Sidebar. The file deletion will be handled manually during code review.

## Pre-read Files
- `src/components/Sidebar.tsx` — Contains the nav array
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Modify

### FILE 1: `src/components/Sidebar.tsx` (MODIFY)

Remove the Core Files entry from the `nav` array and remove the unused `Settings` import.

**In the import line**, remove `Settings` from the lucide-react import. Change:
```typescript
import { BarChart3, FileText, ScrollText, Settings, ClipboardList, User, LogOut, FolderKanban } from "lucide-react";
```
To:
```typescript
import { BarChart3, FileText, ScrollText, ClipboardList, User, LogOut, FolderKanban } from "lucide-react";
```

**In the nav array**, remove the Core Files entry. Change:
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
To:
```typescript
export const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
];
```

**DO NOT change anything else in this file.** Only modify the import line and the nav array.

## DO NOT
- Do NOT touch src/app/core/page.tsx — it will be deleted manually
- Do NOT modify any other files
