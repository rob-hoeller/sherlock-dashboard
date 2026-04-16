import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Cancel all non-completed tasks in the epic
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id,status")
    .eq("epic_id", id)
    .neq("status", "completed");

  if (tasks) {
    for (const task of tasks) {
      await supabaseAdmin
        .from("tasks")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", task.id);
    }
  }

  // Update epic status
  const { data, error } = await supabaseAdmin
    .from("epics")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    tasks_cancelled: tasks?.length || 0,
    epic: data,
  });
}
