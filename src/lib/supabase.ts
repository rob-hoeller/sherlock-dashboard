import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side safe — uses public anon key
export const supabaseClient = createClient(url, anonKey);

// Server-side only — service role key is not available in browser
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || "";
export const supabaseAdmin = createClient(url, serviceKey || anonKey);
