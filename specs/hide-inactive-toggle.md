# Spec: Add Hide Inactive Toggle to Projects Page

**Task ID:** 6f46ad7e-317c-44ad-be52-42ede7d426c8
**Branch:** feat/hide-inactive-toggle

## Overview

Add a toggle switch to the Projects page that hides inactive projects by default. When toggled off, inactive projects become visible (dimmed as they already are).

## Pre-read Files

- `src/app/projects/page.tsx` — The Projects page to modify
- `src/components/ProjectModal.tsx` — Reference for toggle switch pattern
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Modify

### FILE 1: `src/app/projects/page.tsx` (MODIFY)

**1. Add state variable:**
Add a new state variable after the existing state declarations:
```typescript
const [hideInactive, setHideInactive] = useState(true);
```

**2. Update the filtering/sorting logic:**
Find the existing `sortedProjects` computation. Currently it separates active and inactive projects. Modify it to conditionally exclude inactive projects:

```typescript
const sortedProjects = hideInactive
  ? filteredProjects.filter((p) => p.is_active)
  : [
      ...filteredProjects.filter((p) => p.is_active),
      ...filteredProjects.filter((p) => !p.is_active),
    ];
```

**3. Add toggle UI in the header area:**
Between the search bar and the grid, add a toggle row. Place it after the closing `</div>` of the search bar's relative wrapper and before the grid/empty state section:

```tsx
{/* Hide Inactive Toggle */}
<div className="flex items-center gap-3 mb-6">
  <button
    type="button"
    role="switch"
    aria-checked={hideInactive}
    onClick={() => setHideInactive(!hideInactive)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
      hideInactive ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        hideInactive ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
  <span className="text-sm text-zinc-600 dark:text-zinc-400">
    Hide inactive projects
  </span>
</div>
```

**IMPORTANT:** The toggle uses amber-500 when ON (matching the app's accent color). This follows the same toggle pattern used in ProjectModal.tsx for the active/inactive switch.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT change any files other than `src/app/projects/page.tsx`
- Do NOT change the API or type definitions
- Do NOT remove existing functionality
