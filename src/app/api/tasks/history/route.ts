import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("task_history")
    .select("id, task_id, previous_status, new_status, changed_at, changed_by, note")
    .order("changed_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch task names for all unique task_ids
  const taskIds = [...new Set((data || []).map((h: { task_id: string }) => h.task_id))];
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, name")
    .in("id", taskIds);

  const taskNameMap: Record<string, string> = {};
  (tasks || []).forEach((t: { id: string; name: string }) => { taskNameMap[t.id] = t.name; });

  const enriched = (data || []).map((h: Record<string, unknown>) => ({
    ...h,
    task_name: taskNameMap[h.task_id as string] || "Unknown Task",
  }));

  return NextResponse.json(enriched);
}