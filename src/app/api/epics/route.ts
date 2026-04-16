import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("epics")
    .select("*,project:projects!project_id(id,name,color)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch task progress for each epic
  const epicIds = (data || []).map((e: Record<string, unknown>) => e.id);
  let taskCounts: Record<string, { total: number; completed: number }> = {};

  if (epicIds.length > 0) {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("epic_id,status")
      .in("epic_id", epicIds);

    if (tasks) {
      for (const t of tasks) {
        const eid = t.epic_id as string;
        if (!taskCounts[eid]) taskCounts[eid] = { total: 0, completed: 0 };
        taskCounts[eid].total++;
        if (t.status === "completed") taskCounts[eid].completed++;
      }
    }
  }

  const enriched = (data || []).map((e: Record<string, unknown>) => ({
    ...e,
    task_progress: taskCounts[e.id as string] || { total: 0, completed: 0 },
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, name, description } = body;

  if (!project_id || !name) {
    return NextResponse.json({ error: "project_id and name are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("epics")
    .insert({
      project_id,
      name,
      description: description || null,
      status: "planning",
      conversation: [],
      task_breakdown: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
