import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: epic, error } = await supabaseAdmin
    .from("epics")
    .select("*,project:projects!project_id(id,name,color,github_repo_url)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Fetch tasks for this epic
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id,name,status,task_type,epic_order,branch_name,pr_url")
    .eq("epic_id", id)
    .order("epic_order", { ascending: true });

  return NextResponse.json({ ...epic, tasks: tasks || [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowed = ["name", "description", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("epics")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
