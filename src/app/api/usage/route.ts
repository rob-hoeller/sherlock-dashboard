import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("usage_daily_summary")
    .select("*")
    .gte("summary_date", startStr)
    .order("summary_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch model pricing for reference
  const { data: pricing } = await supabaseAdmin
    .from("model_pricing")
    .select("*");

  return NextResponse.json({ usage: data, pricing: pricing || [] });
}
