import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.branch_name) {
    return NextResponse.json({ error: 'No branch name on task' }, { status: 400 });
  }

  const vercelToken = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: 'Vercel not configured' }, { status: 500 });
  }

  // Filter by branch using meta-githubCommitRef
  const branch = encodeURIComponent(task.branch_name);
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&meta-githubCommitRef=${branch}&limit=1&sort=created&direction=desc`,
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
