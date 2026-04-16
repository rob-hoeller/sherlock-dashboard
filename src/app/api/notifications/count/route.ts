import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: unreadCount, error } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("Error fetching unread notification count:", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }

  return NextResponse.json({ count: unreadCount ?? 0 });
}