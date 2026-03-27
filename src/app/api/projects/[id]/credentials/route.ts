import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

  const results = [];

  for (const cred of body) {
    const { key, value } = cred as { key: string; value: string };
    if (!key || !value) continue;

    // Store secret in Supabase Vault
    const { data: vaultId, error: vaultError } = await supabaseAdmin.rpc(
      "create_project_secret",
      { p_secret: value, p_name: `${id}/${key}`, p_description: `Project credential: ${key}` }
    );

    if (vaultError) {
      return NextResponse.json({ error: `Vault error for '${key}': ${vaultError.message}` }, { status: 500 });
    }

    // Insert credential record linking to vault secret
    const { data, error } = await supabaseAdmin
      .from("project_credentials")
      .insert({
        project_id: id,
        key,
        vault_secret_id: vaultId,
        description: null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    results.push(data);
  }

  if (results.length === 0) {
    return NextResponse.json({ error: "No valid credentials provided" }, { status: 400 });
  }

  return NextResponse.json(results, { status: 201 });
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

  // Get vault_secret_id before deleting
  const { data: cred, error: fetchError } = await supabaseAdmin
    .from("project_credentials")
    .select("vault_secret_id")
    .eq("id", credentialId)
    .eq("project_id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Delete from vault
  await supabaseAdmin.rpc("delete_project_secret", { p_secret_id: cred.vault_secret_id });

  // Delete credential record
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
