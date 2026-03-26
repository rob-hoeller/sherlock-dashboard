import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Fixed import path
import { getNextProjectColor } from '@/lib/project-colors';
import type { Project, ProjectWithCounts } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeParam = searchParams.get('active');
  
  let query = supabaseAdmin
    .from('projects')
    .select(`
      *,
      tasks:tasks(count)
    `)
    .order('name', { ascending: true });
  
  // Filter by active status if specified
  if (activeParam === 'true') {
    query = query.eq('is_active', true);
  } else if (activeParam === 'false') {
    query = query.eq('is_active', false);
  }
  
  const { data: projects, error } = await query;
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message },
      { status: 500 }
    );
  }
  
  // Transform data to include task counts
  const projectsWithCounts: ProjectWithCounts[] = await Promise.all(
    (projects || []).map(async (project: any) => { // Added type annotation
      // Get active task count
      const { count: activeCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .not('status', 'in', '(completed,cancelled,merged)');
      
      // Get total task count
      const { count: totalCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);
      
      return {
        ...project,
        task_count: totalCount || 0,
        active_task_count: activeCount || 0,
      };
    })
  );
  
  return NextResponse.json(projectsWithCounts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, github_repo_url, settings } = body;
  
  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Project name is required' },
      { status: 400 }
    );
  }
  
  // Check for duplicate name
  const { data: existing } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('name', name.trim())
    .single();
  
  if (existing) {
    return NextResponse.json(
      { error: 'A project with this name already exists' },
      { status: 409 }
    );
  }
  
  // Get all existing projects to determine next color
  const { data: allProjects } = await supabaseAdmin
    .from('projects')
    .select('color');
  
  const color = getNextProjectColor(allProjects || []);
  
  // Create project
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      github_repo_url: github_repo_url?.trim() || null,
      color,
      settings: settings || {},
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(project, { status: 201 });
}