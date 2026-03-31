import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/projects/[id]/setup
 * Creates a setup job for the host-side worker to pick up.
 * The wizard polls GET for status updates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Verify project exists
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id,name,github_repo_url")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.github_repo_url) {
    return NextResponse.json({ error: "Project has no GitHub repo URL" }, { status: 400 });
  }

  // Check for existing pending/running job
  const { data: existing } = await supabaseAdmin
    .from("project_setup_jobs")
    .select("id,status")
    .eq("project_id", id)
    .in("status", ["pending", "running"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      error: "A setup job is already in progress",
      job_id: (existing[0] as { id: string }).id,
    }, { status: 409 });
  }

  // Create setup job
  const { data: job, error: jobError } = await supabaseAdmin
    .from("project_setup_jobs")
    .insert({
      project_id: id,
      project_type: body.project_type || "existing",
      status: "pending",
    })
    .select()
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  return NextResponse.json(job, { status: 201 });
}

/**
 * GET /api/projects/[id]/setup
 * Returns the latest setup job status for this project.
 * The wizard polls this endpoint to track progress.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: jobs, error } = await supabaseAdmin
    .from("project_setup_jobs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ status: "none" });
  }

  const job = jobs[0] as {
    id: string;
    status: string;
    error: string | null;
    detected_settings: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  };

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    error: job.error,
    detected_settings: job.detected_settings,
    created_at: job.created_at,
    updated_at: job.updated_at,
    completed_at: job.completed_at,
  });
}
