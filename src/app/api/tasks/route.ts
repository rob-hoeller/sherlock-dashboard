import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const status = params.get("status");
  const search = params.get("search");
  const completedDays = parseInt(params.get("completedDays") || "30", 10);

  let query = supabaseAdmin
    .from("tasks")
    .select("*,project:projects!project_id(id,name,color)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
    if (status === "completed") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - completedDays);
      query = query.gte("completed_at", cutoff.toISOString());
    }
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, task_type, github_repo } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      name,
      description: description || null,
      task_type: task_type || "feature",
      github_repo: github_repo || "rob-hoeller/sherlock-dashboard",
      status: "planning",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert history row
  await supabaseAdmin.from("task_history").insert({
    task_id: data.id,
    previous_status: null,
    new_status: "planning",
    changed_by: "sherlock",
    note: "Task created",
  });

  return NextResponse.json(data, { status: 201 });
}