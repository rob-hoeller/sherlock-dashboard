import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("global_vars_decrypted")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask secret values: show "••••••" + last 4 chars
  const masked = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    is_secret: row.is_secret,
    value: row.is_secret
      ? "••••••" + (row.value ? row.value.slice(-4) : "")
      : row.value,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, value, description, category, is_secret } = body;

  if (!name || !value) {
    return NextResponse.json(
      { error: "Name and value are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("upsert_global_var", {
    p_name: name,
    p_value: value,
    p_description: description || null,
    p_category: category || "general",
    p_is_secret: is_secret !== undefined ? is_secret : true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}