import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ids, all } = body as { ids?: string[]; all?: boolean };

  if (all) {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("is_read", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids or all required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
