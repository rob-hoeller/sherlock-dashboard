import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Returns the database schema by querying the PostgREST OpenAPI spec.
 * Used by the PM agent to understand the data model.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: "application/openapi+json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 });
    }

    const spec = await res.json();
    const definitions = spec.definitions || {};

    // Transform into a clean schema format
    const schema: Record<string, { columns: { name: string; type: string; required: boolean }[] }> = {};

    for (const [tableName, def] of Object.entries(definitions)) {
      const typedDef = def as { properties?: Record<string, { type?: string; format?: string; description?: string }>; required?: string[] };
      const props = typedDef.properties || {};
      const required = new Set(typedDef.required || []);

      schema[tableName] = {
        columns: Object.entries(props).map(([colName, colDef]) => ({
          name: colName,
          type: colDef.format || colDef.type || "unknown",
          required: required.has(colName),
        })),
      };
    }

    return NextResponse.json(schema);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
