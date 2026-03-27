# Spec: Projects Page — CRUD with Soft Delete

**Task ID:** c31ced71-2d1a-4b11-aaa4-2258d18338b3
**Branch:** feat/projects-page

## Overview

Add a Projects page to the Sherlock Dashboard. Users can view all projects, add new projects, and edit existing ones. No hard delete — only active/inactive toggle.

## Pre-read Files

Read these files before generating any code:

- `src/types/tasks.ts` — existing type patterns
- `src/lib/supabase.ts` — supabase client imports
- `src/lib/supabase-auth.ts` — browser client
- `src/components/Sidebar.tsx` — nav array to modify
- `src/components/NewTaskModal.tsx` — modal pattern to follow
- `src/app/api/tasks/route.ts` — API route pattern to follow
- `.baker-street.json` — framework instructions (CRITICAL)

## Database Schema

The `projects` table has these columns:
```
id           uuid (PK, auto-generated)
name         text (required)
description  text (nullable)
github_repo_url  text (nullable)
color        text (nullable, hex color like "#3B82F6")
is_active    boolean (default true)
settings     jsonb (default {})
created_at   timestamptz (auto)
updated_at   timestamptz (auto)
```

## Files to Create/Modify

### FILE 1: `src/types/projects.ts` (NEW)

```typescript
export interface Project {
  id: string;
  name: string;
  description: string | null;
  github_repo_url: string | null;
  color: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### FILE 2: `src/app/api/projects/route.ts` (NEW)

- GET: Fetch all projects, ordered by `created_at` descending. Accept optional `?active=true` query param to filter by `is_active`.
- POST: Create a new project. Required field: `name`. Optional: `description`, `github_repo_url`, `color`. Default `is_active` to `true`.
- Use `supabaseAdmin` from `@/lib/supabase` (server-side).
- Use `NextRequest` and `NextResponse` from `next/server`.
- Follow exact same pattern as `src/app/api/tasks/route.ts`.

### FILE 3: `src/app/api/projects/[id]/route.ts` (NEW)

- PUT: Update a project by id. Accept any subset of: `name`, `description`, `github_repo_url`, `color`, `is_active`. Set `updated_at` to `new Date().toISOString()`.
- NO DELETE endpoint.
- Route params pattern: `{ params }: { params: Promise<{ id: string }> }` with `const { id } = await params;`
- Use `supabaseAdmin` from `@/lib/supabase`.

### FILE 4: `src/app/projects/page.tsx` (NEW)

A client-side page (`"use client"`) that displays projects in a card grid.

**Layout:**
- Page header: "Projects" title on left, "+ New Project" button on right (green, matches NewTaskModal submit button style)
- Search bar below header (same style as tasks page search)
- Card grid: responsive grid (1 col mobile, 2 col md, 3 col lg)

**Project Card:**
- White card with border (dark mode: zinc-900 bg, zinc-700 border) — same card style as TaskCard
- Left color accent bar using project's `color` field (4px wide vertical bar on left edge)
- Project name (bold, truncated)
- Description (2 lines max, text-sm, zinc-500)
- GitHub repo URL as a small link with GithubIcon (if present)
- Active/Inactive badge: green "Active" or gray "Inactive" pill
- Edit button (pencil icon) in top-right corner of card

**Inactive projects:** Show at the bottom, slightly dimmed (opacity-60).

**Search:** Filter by name or description (client-side filter is fine).

**"+ New Project" button** opens a modal (see FILE 5).

**Edit:** Clicking the edit button opens the same modal pre-filled with the project's data.

**Fetch data:** Use `fetch('/api/projects')` on mount — do NOT import supabaseAdmin or supabaseClient directly.

### FILE 5: `src/components/ProjectModal.tsx` (NEW)

A modal for creating and editing projects. Follow the exact same structure as `NewTaskModal.tsx`.

**Props:**
```typescript
interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  project?: Project | null; // null/undefined = create mode, present = edit mode
}
```

**Fields:**
- Name (text input, required) — same input style as NewTaskModal
- Description (textarea, 3 rows) — same style
- GitHub Repo URL (text input, optional)
- Color (text input for hex, optional — show small color swatch preview next to input)
- Active toggle (only shown in edit mode) — a simple toggle switch or checkbox

**Behavior:**
- Create mode: POST to `/api/projects`, button says "Create Project"
- Edit mode: PUT to `/api/projects/{id}`, button says "Save Changes"
- Same error handling pattern as NewTaskModal
- Reset form and close on success

### FILE 6: `src/components/Sidebar.tsx` (MODIFY)

Add Projects link to the `nav` array ABOVE the Tasks entry:

```typescript
import { BarChart3, FileText, ScrollText, Settings, ClipboardList, User, LogOut, FolderKanban } from "lucide-react";

export const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/core", label: "Core Files", icon: Settings },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
];
```

**DO NOT MODIFY** any other part of Sidebar.tsx. Only change the imports line and the nav array.

## Styling Rules

- All colors use zinc palette (dark mode via `dark:` prefix)
- Accent color: amber-500 for focus rings, active nav states
- Button colors: green-600 for primary actions (create/save), zinc for cancel
- Card hover: `hover:shadow-md transition-shadow`
- Follow existing Tailwind classes from TaskCard and NewTaskModal exactly
- Dark mode support on every element

## DO NOT

- Do NOT add a delete button or DELETE API endpoint
- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT use `.from<Type>()` Supabase generics
- Do NOT import supabaseAdmin or supabaseClient in client components
- Do NOT invent database columns that don't exist
