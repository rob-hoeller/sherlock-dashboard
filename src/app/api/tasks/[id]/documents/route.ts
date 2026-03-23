import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("task_documents")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { file_name, doc_type, content } = body;

  if (!file_name || !content) {
    return NextResponse.json(
      { error: "file_name and content are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("task_documents")
    .insert({
      task_id: id,
      file_name,
      doc_type: doc_type || "planning",
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
