// src/app/api/colors/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("model_pricing")
    .select("model, color_code")
    .not("color_code", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  const modelColors = data.reduce((acc: Record<string, string>, { model, color_code }: { model: string; color_code: string }) => {
    acc[model] = color_code;
    return acc;
  }, {});

  return new Response(JSON.stringify(modelColors), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}