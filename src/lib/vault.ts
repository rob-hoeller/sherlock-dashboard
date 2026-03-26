import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Store a secret in Supabase Vault
 * Returns the vault secret ID (NOT the secret value)
 */
export async function storeSecret(value: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .rpc('vault_create_secret', { secret: value });
  
  if (error) {
    throw new Error(`Failed to store secret in vault: ${error.message}`);
  }
  
  return data as string;
}

/**
 * Retrieve a secret from Supabase Vault
 * Only use server-side - NEVER expose to client
 */
export async function getSecret(vaultSecretId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', vaultSecretId)
    .single();
  
  if (error) {
    throw new Error(`Failed to retrieve secret from vault: ${error.message}`);
  }
  
  return data.decrypted_secret;
}

/**
 * Delete a secret from Supabase Vault
 * Call when deleting a credential
 */
export async function deleteSecret(vaultSecretId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .rpc('vault_delete_secret', { secret_id: vaultSecretId });
  
  if (error) {
    // Log but don't throw - credential should still be deleted from our table
    console.error(`Failed to delete secret from vault: ${error.message}`);
  }
}