import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .select(`
      *,
      project:projects (
        id,
        name,
        color,
        github_repo_url,
        settings
      )
    `)
    .eq("id", id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data: documents } = await supabaseAdmin
    .from("task_documents")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: false });

  const { data: history } = await supabaseAdmin
    .from("task_history")
    .select("*")
    .eq("task_id", id)
    .order("changed_at", { ascending: false });

  return NextResponse.json({
    ...task,
    documents: documents || [],
    history: history || [],
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  // If status is changing, record history
  if (body.status) {
    const { data: current } = await supabaseAdmin
      .from("tasks")
      .select("status")
      .eq("id", id)
      .single();

    if (current && current.status !== body.status) {
      await supabaseAdmin.from("task_history").insert({
        task_id: id,
        previous_status: current.status,
        new_status: body.status,
        changed_by: body.changed_by || "sherlock",
        note: body.note || null,
      });

      // Set/clear completed_at
      if (body.status === "completed") {
        body.completed_at = new Date().toISOString();
      } else if (current.status === "completed") {
        body.completed_at = null;
      }
    }
  }

  // Remove non-column fields before update
  const { changed_by, note, ...updateFields } = body;

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json(data);
}