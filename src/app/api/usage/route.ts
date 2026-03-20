import { NextRequest, NextResponse } from "next/server";
import { parseUsage } from "@/lib/usage-parser";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const days = parseInt(params.get("days") || "30", 10);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date(end.getTime() + 86400000).toISOString().slice(0, 10);

  const data = parseUsage(startStr, endStr);
  return NextResponse.json(data);
}
