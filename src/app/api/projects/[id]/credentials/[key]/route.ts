import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Ensure this path is correct or use relative import if needed
import { deleteSecret } from '@/lib/vault';

type RouteContext = {
  params: Promise<{ id: string; key: string }>;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id: projectId, key } = await context.params;
  
  // Fetch credential to get vault_secret_id
  const { data: credential, error: fetchError } = await supabaseAdmin
    .from('project_credentials')
    .select('vault_secret_id')
    .eq('project_id', projectId)
    .eq('key', key)
    .single();
  
  if (fetchError || !credential) {
    return NextResponse.json(
      { error: 'Credential not found' },
      { status: 404 }
    );
  }
  
  // Delete from database
  const { error: deleteError } = await supabaseAdmin
    .from('project_credentials')
    .delete()
    .eq('project_id', projectId)
    .eq('key', key);
  
  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete credential', details: deleteError.message },
      { status: 500 }
    );
  }
  
  // Try to delete from Vault (non-blocking)
  try {
    await deleteSecret(credential.vault_secret_id);
  } catch (err) {
    console.error('Failed to delete secret from vault:', err);
    // Continue anyway - database record is deleted
  }
  
  return new NextResponse(null, { status: 204 });
}