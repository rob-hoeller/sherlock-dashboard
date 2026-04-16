import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ids, all, is_read } = body as { ids?: string[]; all?: boolean; is_read?: boolean };

  // Default to marking as read; pass is_read=false to mark unread
  const readValue = is_read !== false;
  const readAt = readValue ? new Date().toISOString() : null;

  if (all) {
    const updateData: Record<string, unknown> = { is_read: readValue, read_at: readAt };
    let query = supabaseAdmin.from("notifications").update(updateData);

    // "Mark all read" only targets unread; "mark all unread" only targets read
    query = readValue ? query.eq("is_read", false) : query.eq("is_read", true);

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids or all required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: readValue, read_at: readAt })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
