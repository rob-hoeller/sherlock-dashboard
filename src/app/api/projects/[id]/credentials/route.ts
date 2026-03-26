import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Fixed import statement
import { storeSecret } from '@/lib/vault';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  
  const { data: credentials, error } = await supabaseAdmin
    .from('project_credentials')
    .select('key, description, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true });
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch credentials', details: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(credentials || []);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id: projectId } = await context.params;
  const body = await request.json();
  const { key, value, description } = body;
  
  // Validate
  if (!key || !value) {
    return NextResponse.json(
      { error: 'Key and value are required' },
      { status: 400 }
    );
  }
  
  // Check for duplicate key
  const { data: existing } = await supabaseAdmin
    .from('project_credentials')
    .select('id')
    .eq('project_id', projectId)
    .eq('key', key)
    .single();
  
  if (existing) {
    return NextResponse.json(
      { error: 'A credential with this key already exists' },
      { status: 409 }
    );
  }
  
  try {
    // Store secret in Vault
    const vaultSecretId = await storeSecret(value);
    
    // Store reference in database
    const { data: credential, error: insertError } = await supabaseAdmin
      .from('project_credentials')
      .insert({
        project_id: projectId,
        key,
        vault_secret_id: vaultSecretId,
        description: description || null,
      })
      .select('key, description, created_at')
      .single();
    
    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to store credential', details: insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(credential, { status: 201 });
  } catch (err: any) { // Added type annotation for err
    return NextResponse.json(
      { error: 'Failed to store secret in vault', details: err.message },
      { status: 500 }
    );
  }
}