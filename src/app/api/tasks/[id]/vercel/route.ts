import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Task } from '@/types/tasks';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch the task from Supabase
  const { data: taskData, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const task = taskData as Task;

  // Check if branch_name is present
  if (!task.branch_name) {
    return NextResponse.json({ error: 'Branch name not specified in the task' }, { status: 400 });
  }

  const vercelToken = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: 'Vercel API token or project ID not configured' }, { status: 500 });
  }

  // Call the Vercel API to find the latest deployment for that branch
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=preview&limit=1&state=READY`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch deployments from Vercel' }, { status: res.status });
  }

  const data = await res.json();

  // Filter for the matching branch in data.deployments
  const deployment = data.deployments.find((d: any) => d.meta.githubCommitRef === task.branch_name);

  if (!deployment) {
    return NextResponse.json({ preview_url: null, message: 'No deployment found' }, { status: 200 });
  }

  // Update the task record with the new vercel_preview_url and vercel_deployment_id
  const { data: updatedTaskData, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({
      vercel_preview_url: `https://${deployment.url}`,
      vercel_deployment_id: deployment.uid,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }

  const updatedTask = updatedTaskData as Task;

  // Return the updated task
  return NextResponse.json(updatedTask, { status: 200 });
}