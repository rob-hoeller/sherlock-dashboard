import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filePath = params.get("path") || "";
  const mode = params.get("mode") || "list";
  const fileType = params.get("type") || "";

  if (mode === "read") {
    const { data, error } = await supabaseAdmin
      .from("workspace_files")
      .select("file_path, file_name, file_type, content, size_bytes, updated_at")
      .eq("file_path", filePath)
      .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  // List mode: filter by type or path prefix
  let query = supabaseAdmin
    .from("workspace_files")
    .select("file_path, file_name, file_type, size_bytes, updated_at");

  if (fileType) {
    query = query.eq("file_type", fileType);
  } else if (filePath) {
    // List files within a subdirectory
    query = query.like("file_path", `${filePath}/%`);
  }

  const { data, error } = await query.order("file_path");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PUT(req: NextRequest) {
  const { path: filePath, content } = await req.json();
  if (!filePath || typeof content !== "string") {
    return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
  }

  // Only allow governing file edits
  const { data: existing } = await supabaseAdmin
    .from("workspace_files")
    .select("file_type")
    .eq("file_path", filePath)
    .single();

  if (!existing || existing.file_type !== "governing") {
    return NextResponse.json({ error: "Not a governing file" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("workspace_files")
    .update({ content, size_bytes: new TextEncoder().encode(content).length, updated_at: new Date().toISOString() })
    .eq("file_path", filePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
