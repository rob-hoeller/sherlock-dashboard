import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeParam = searchParams.get("active");

  let query = supabaseAdmin.from("projects").select("*").order("created_at", { ascending: false });

  if (activeParam !== null) {
    const isActive = activeParam === "true";
    query = query.eq("is_active", isActive);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, github_repo_url, color } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({ name, description: description || null, github_repo_url: github_repo_url || null, color: color || null, is_active: true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
