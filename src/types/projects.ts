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

export interface ProjectCredential {
  id: string;
  project_id: string;
  key: string;
  vault_secret_id: string;
  created_at: string;
  updated_at: string;
}