import { NextRequest, NextResponse } from "next/server";
import { listDigests, readFile } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const digests = listDigests();
    const match = digests.find((d) => d.date === date);
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const content = readFile(match.path);
    return NextResponse.json({ date: match.date, content });
  }

  return NextResponse.json(listDigests());
}
