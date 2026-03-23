import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;

  const { data, error } = await supabaseAdmin
    .from("task_documents")
    .select("*")
    .eq("id", docId)
    .eq("task_id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const body = await req.json();
  const { file_name, doc_type, content } = body;

  const updateFields: Record<string, string> = {};
  if (file_name !== undefined) updateFields.file_name = file_name;
  if (doc_type !== undefined) updateFields.doc_type = doc_type;
  if (content !== undefined) updateFields.content = content;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_documents")
    .update(updateFields)
    .eq("id", docId)
    .eq("task_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json(data);
}
