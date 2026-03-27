# Spec: Add Project Environment Variables to Project Modal

**Task ID:** fe05e114-fd0e-4d30-ad52-34c0a8fca419
**Branch:** feat/project-env-vars

## Overview

Add a key-value pair editor to the ProjectModal for managing project environment variables (credentials). Users can add multiple pairs before saving. Secrets are stored via Supabase Vault.

## Database Schema (Discovered)

The `project_credentials` table has these columns:
```
id               uuid (PK, auto-generated)
project_id       uuid (FK to projects.id, NOT NULL)
key              text (NOT NULL) — the environment variable name
vault_secret_id  uuid (NOT NULL) — reference to Supabase Vault secret
(column5)        unknown — possibly description or label
created_at       timestamptz (auto)
updated_at       timestamptz (auto)
```

**IMPORTANT:** This table uses Supabase Vault for secret storage. Values are NOT stored as plaintext in this table — only the vault_secret_id reference is stored. Creating a credential requires:
1. First storing the secret value in Vault via `vault.create_secret(value, name)`
2. Then storing the returned secret_id in the project_credentials row

## Pre-read Files

- `src/components/ProjectModal.tsx` — The modal to modify
- `src/types/projects.ts` — Project types
- `src/lib/supabase.ts` — Supabase client imports
- `.baker-street.json` — Framework instructions (CRITICAL)

## Files to Create/Modify

### FILE 1: `src/types/projects.ts` (MODIFY)

Add a ProjectCredential interface:

```typescript
export interface ProjectCredential {
  id: string;
  project_id: string;
  key: string;
  vault_secret_id: string;
  created_at: string;
  updated_at: string;
}
```

### FILE 2: `src/app/api/projects/[id]/credentials/route.ts` (NEW)

**GET:** Fetch all credentials for a project. Return key names only (NOT secret values) for display.

```typescript
const { data, error } = await supabaseAdmin
  .from("project_credentials")
  .select("id,key,created_at")
  .eq("project_id", id)
  .order("created_at", { ascending: true });
```

**POST:** Create new credential(s). Accept an array of `{ key, value }` pairs.

For each pair:
1. Call Vault to store the secret: `await supabaseAdmin.rpc('vault.create_secret', { secret: value, name: key })`
2. Insert into project_credentials with the returned vault_secret_id

**DELETE:** Delete a credential by id. Also remove the vault secret.

### FILE 3: `src/components/ProjectModal.tsx` (MODIFY)

Add a "Environment Variables" section below the Color picker and above the Active toggle.

**UI Design:**
- Section label: "Environment Variables"
- Each row: key input (text) + value input (password-style, masked) + remove button (X icon)
- "Add Variable" button at the bottom of the list (+ icon, small text link style)
- For existing credentials (edit mode): show key names with masked placeholder values. Only show delete button, not the actual value (for security).
- New credentials: show both key and value inputs

**Behavior:**
- On modal open in edit mode: fetch existing credentials from `/api/projects/{id}/credentials`
- New credential rows are stored in local state until save
- On save: POST new credentials to the API, then refresh

**IMPORTANT:** Use inline styles for any dynamic colors. Follow existing modal patterns exactly.

## DO NOT

- Do NOT modify `globals.css`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, or `postcss.config.mjs`
- Do NOT store secret values in plaintext in the project_credentials table
- Do NOT display actual secret values in the UI — only key names
- Do NOT use `.from<Type>()` Supabase generics
