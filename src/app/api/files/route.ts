import { NextRequest, NextResponse } from "next/server";
import { listFiles, readFile, writeGoverningFile } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filePath = params.get("path") || "";
  const mode = params.get("mode") || "list";

  if (mode === "read") {
    const content = readFile(filePath);
    if (content === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ path: filePath, content });
  }

  const files = listFiles(filePath);
  return NextResponse.json(files);
}

export async function PUT(req: NextRequest) {
  const { path: filePath, content } = await req.json();
  if (!filePath || typeof content !== "string") {
    return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
  }
  const ok = writeGoverningFile(filePath, content);
  if (!ok) return NextResponse.json({ error: "Not a governing file" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
