import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface TaskBreakdownItem {
  order: number;
  name: string;
  description: string;
  type: "pipeline" | "human";
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch the epic
  const { data: epic, error } = await supabaseAdmin
    .from("epics")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !epic) {
    return NextResponse.json({ error: "Epic not found" }, { status: 404 });
  }

  if (epic.status !== "planning") {
    return NextResponse.json(
      { error: `Epic is in '${epic.status}' status, can only approve from 'planning'` },
      { status: 400 }
    );
  }

  const breakdown: TaskBreakdownItem[] = epic.task_breakdown || [];
  if (breakdown.length === 0) {
    return NextResponse.json({ error: "No task breakdown to approve" }, { status: 400 });
  }

  // Create tasks from the breakdown
  const createdTasks: string[] = [];
  for (const item of breakdown) {
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        name: item.name,
        description: item.description,
        task_type: item.type || "pipeline",
        status: "planning",
        project_id: epic.project_id,
        epic_id: id,
        epic_order: item.order,
      })
      .select("id")
      .single();

    if (taskError) {
      console.error(`Failed to create task ${item.name}:`, taskError);
      continue;
    }

    createdTasks.push(task.id);

    // Create plan action ONLY for task #1 — the rest wait for auto-advance
    if (item.order === 1 && item.type === "pipeline") {
      await supabaseAdmin.from("task_actions").insert({
        task_id: task.id,
        action_type: "plan",
        user_name: "epic_approval",
        payload: { epic_id: id, auto_approved: true },
        processed: false,
      });
    }

    // Insert initial history
    await supabaseAdmin.from("task_history").insert({
      task_id: task.id,
      previous_status: null,
      new_status: "planning",
      changed_by: "epic_approval",
      note: `Created from epic: ${epic.name} (task ${item.order}/${breakdown.length})`,
    });
  }

  // Update epic status
  await supabaseAdmin
    .from("epics")
    .update({
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    epic_status: "in_progress",
    tasks_created: createdTasks.length,
  });
}
