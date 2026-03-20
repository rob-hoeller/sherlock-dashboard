import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const search = req.nextUrl.searchParams.get("search");

  if (date && !search) {
    const { data, error } = await supabaseAdmin
      .from("workspace_files")
      .select("file_path, file_name, content, size_bytes, updated_at")
      .eq("file_type", "digest")
      .like("file_name", `%${date}%`)
      .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  let query = supabaseAdmin
    .from("workspace_files")
    .select("file_path, file_name, size_bytes, updated_at")
    .eq("file_type", "digest");

  if (search) {
    query = query.textSearch("content", search, { type: "websearch" }).order("rank", { ascending: false });
  } else {
    query = query.order("file_name", { ascending: false });
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (search && data) {
    const resultsWithSnippets = data.map((digest) => {
      const regex = new RegExp(search, "gi");
      let matchIndex = digest.content.search(regex);
      let snippetStart = Math.max(0, matchIndex - 75);
      let snippetEnd = Math.min(digest.content.length, snippetStart + 150);
      let snippet = digest.content.substring(snippetStart, snippetEnd);

      // Ensure the search term is highlighted in the snippet
      snippet = snippet.replace(regex, (match) => `<strong>${match}</strong>`);

      return {
        ...digest,
        snippet: snippet,
      };
    });

    return NextResponse.json(resultsWithSnippets);
  }

  return NextResponse.json(data || []);
}