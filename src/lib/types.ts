// Task types
export type TaskStatus =
  | 'planning'
  | 'needs_review'
  | 'approved'
  | 'on_deck'
  | 'in_process'
  | 'commit_ready'
  | 'preview'
  | 'merged'
  | 'completed'
  | 'cancelled'
  | 'blocked';

export type TaskType = 'feature' | 'bug' | 'chore';

// Project types
export type Project = {
  id: string;
  name: string;
  description: string | null;
  github_repo_url: string | null;
  color: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProjectWithCounts = Project & {
  task_count: number;
  active_task_count: number;
};

export type ProjectCredential = {
  id: string;
  project_id: string;
  key: string;
  vault_secret_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectCredentialPublic = {
  key: string;
  description: string | null;
  created_at: string;
};

// Task type
export type Task = {
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
  project_id: string;
  project?: Project;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  retry_count: number;
};
