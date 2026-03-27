import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("project_credentials")
    .select("id,key,description,created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of credentials" }, { status: 400 });
  }

  const rows = body
    .filter((c: { key: string; value: string }) => c.key && c.value)
    .map((c: { key: string; value: string }) => ({
      project_id: id,
      key: c.key,
      // TODO: Integrate with Supabase Vault for proper secret storage
      // Vault RPC functions are not exposed via PostgREST — requires DB migration or edge function
      vault_secret_id: randomUUID(),
      description: null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid credentials provided" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("project_credentials")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const credentialId = searchParams.get("credentialId");

  if (!credentialId) {
    return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("project_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
