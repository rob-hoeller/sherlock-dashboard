import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const { data, error } = await supabaseAdmin
      .from("workspace_files")
      .select("file_path, file_name, content, size_bytes, updated_at")
      .eq("file_type", "digest")
      .like("file_name", `%${date}%`)
      .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from("workspace_files")
    .select("file_path, file_name, size_bytes, updated_at")
    .eq("file_type", "digest")
    .order("file_name", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
