import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveVercelCreds(projectId: string | null): Promise<{ token: string; projectId: string } | null> {
  if (!projectId) return null;

  const { data: creds, error } = await supabaseAdmin
    .from('project_credentials')
    .select('key,vault_secret_id')
    .eq('project_id', projectId)
    .in('key', ['VERCEL_PROJECT_ID', 'VERCEL_API_TOKEN']);

  if (error || !creds) return null;

  const byKey = new Map<string, string>();
  for (const c of creds as { key: string; vault_secret_id: string }[]) {
    byKey.set(c.key, c.vault_secret_id);
  }

  const vaultProjectId = byKey.get('VERCEL_PROJECT_ID');
  const vaultToken = byKey.get('VERCEL_API_TOKEN');

  if (!vaultProjectId || !vaultToken) return null;

  const [{ data: vercelProjectId }, { data: vercelToken }] = await Promise.all([
    supabaseAdmin.rpc('read_project_secret', { p_secret_id: vaultProjectId }),
    supabaseAdmin.rpc('read_project_secret', { p_secret_id: vaultToken }),
  ]);

  if (!vercelProjectId || !vercelToken) return null;

  return { token: vercelToken as string, projectId: vercelProjectId as string };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('id,branch_name,project_id')
    .eq('id', id)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.branch_name) {
    return NextResponse.json({ error: 'No branch name on task' }, { status: 400 });
  }

  // Prefer per-project Vercel creds from Vault; fall back to env vars (legacy)
  const fromVault = await resolveVercelCreds(task.project_id as string | null);
  const vercelToken = fromVault?.token ?? process.env.VERCEL_API_TOKEN;
  const vercelProjectId = fromVault?.projectId ?? process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelProjectId) {
    return NextResponse.json({ error: 'Vercel not configured for this project' }, { status: 500 });
  }

  // Filter by branch using meta-githubCommitRef
  const branch = encodeURIComponent(task.branch_name);
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&meta-githubCommitRef=${branch}&limit=5&sort=created&direction=desc`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Vercel API error' }, { status: res.status });
  }

  const data = await res.json();
  const deployment = (data.deployments || []).find(
    (d: Record<string, unknown>) => {
      const state = (d.readyState || d.state) as string;
      return state === 'READY';
    }
  );

  if (!deployment) {
    return NextResponse.json({ error: 'No ready deployment found for branch' }, { status: 404 });
  }

  const previewUrl = `https://${deployment.url}`;

  // Update task with new URL
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({
      vercel_preview_url: previewUrl,
      vercel_deployment_id: deployment.uid || null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return POST(request, { params });
}
