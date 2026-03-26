import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Project } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  // Fetch project
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }
  
  // Fetch credentials (keys only, not secret IDs)
  const { data: credentials, error: credError } = await supabaseAdmin
    .from('project_credentials')
    .select('key, description, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true });
  
  if (credError) {
    return NextResponse.json(
      { error: 'Failed to fetch credentials', details: credError.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    ...project,
    credentials: credentials || [],
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const body = await request.json();
  
  // Prevent updating protected fields
  const allowedFields = ['name', 'description', 'github_repo_url', 'settings', 'is_active'];
  const updates: Partial<Project> = {};
  
  for (const field of allowedFields) {
    if (field in body) {
      updates[field as keyof Project] = body[field];
    }
  }
  
  // Add updated_at
  updates.updated_at = new Date().toISOString();
  
  // If updating name, check uniqueness
  if (updates.name) {
    const { data: existing } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('name', updates.name)
      .neq('id', id)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }
  }
  
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(project);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const confirmed = searchParams.get('confirmed') === 'true';
  
  // Check for incomplete tasks
  const { data: incompleteTasks, error: countError } = await supabaseAdmin
    .from('tasks')
    .select('id, name, status')
    .eq('project_id', id)
    .not('status', 'in', '(completed,cancelled,merged)');
  
  if (countError) {
    return NextResponse.json(
      { error: 'Failed to check tasks', details: countError.message },
      { status: 500 }
    );
  }
  
  const incompleteCount = incompleteTasks?.length || 0;
  
  // If tasks exist and not confirmed, return error
  if (incompleteCount > 0 && !confirmed) {
    return NextResponse.json(
      {
        error: 'incomplete_tasks',
        count: incompleteCount,
        message: 'Cannot deactivate project with incomplete tasks',
      },
      { status: 400 }
    );
  }
  
  // If confirmed, cancel all incomplete tasks
  if (incompleteCount > 0) {
    const taskIds = incompleteTasks!.map(t => t.id);
    
    // Update tasks to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'cancelled' as const,
        updated_at: new Date().toISOString(),
      })
      .in('id', taskIds);
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel tasks', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Add history entries
    const historyEntries = incompleteTasks!.map(task => ({
      task_id: task.id,
      previous_status: task.status,
      new_status: 'cancelled' as const,
      changed_by: 'system',
      note: 'Project deactivated',
    }));
    
    await supabaseAdmin
      .from('task_history')
      .insert(historyEntries);
  }
  
  // Soft delete project
  const { error: deactivateError } = await supabaseAdmin
    .from('projects')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (deactivateError) {
    return NextResponse.json(
      { error: 'Failed to deactivate project', details: deactivateError.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    cancelled_count: incompleteCount,
  });
}