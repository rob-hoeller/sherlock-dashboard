import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  
  // Accept either start/end or days (backward compat)
  let startStr: string;
  let endStr: string;

  if (params.has("start") && params.has("end")) {
    startStr = params.get("start")!;
    endStr = params.get("end")!;
  } else {
    const days = parseInt(params.get("days") || "30", 10);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    startStr = start.toISOString().slice(0, 10);
    endStr = end.toISOString().slice(0, 10);
  }

  const { data, error } = await supabaseAdmin
    .from("usage_daily_summary")
    .select("*")
    .gte("summary_date", startStr)
    .lte("summary_date", endStr)
    .order("summary_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pricing } = await supabaseAdmin
    .from("model_pricing")
    .select("*");

  return NextResponse.json({ usage: data, pricing: pricing || [] });
}
