import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: notifications, error } = await supabaseAdmin
    .from("notifications")
    .select(`
      *,
      sender:users!sender_id(name, avatar_url),
      project:projects!project_id(name, id)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notification_ids } = body;

  if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
    return NextResponse.json({ error: "Invalid request: notification_ids must be a non-empty array" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notification_ids)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}