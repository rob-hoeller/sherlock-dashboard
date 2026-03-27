import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("project_credentials")
    .select("id,key,created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const credentials = await request.json();

  if (!Array.isArray(credentials)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const newCredentials = [];

  for (const { key, value } of credentials) {
    const { data: vaultData, error: vaultError } = await supabaseAdmin.rpc('vault.create_secret', { secret: value, name: key });

    if (vaultError) {
      return NextResponse.json({ error: vaultError.message }, { status: 500 });
    }

    newCredentials.push({
      project_id: id,
      key,
      vault_secret_id: vaultData.id
    });
  }

  const { data, error } = await supabaseAdmin
    .from("project_credentials")
    .insert(newCredentials)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const credentialId = searchParams.get('credentialId');

  if (!credentialId) {
    return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });
  }

  // Fetch the vault_secret_id to delete the secret from Vault
  const { data, error } = await supabaseAdmin
    .from("project_credentials")
    .select("vault_secret_id")
    .eq("id", credentialId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Delete the secret from Vault
  const { error: vaultError } = await supabaseAdmin.rpc('vault.delete_secret', { secret_id: data.vault_secret_id });

  if (vaultError) {
    return NextResponse.json({ error: vaultError.message }, { status: 500 });
  }

  // Delete the credential from project_credentials
  const { error: deleteError } = await supabaseAdmin
    .from("project_credentials")
    .delete()
    .eq("id", credentialId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Credential deleted successfully" });
}