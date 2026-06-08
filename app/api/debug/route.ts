import { NextResponse } from "next/server";

export function GET() {
  const env = {
    APIFY_TOKEN: process.env.APIFY_TOKEN ?? null,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? null,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    NEXT_PUBLIC_SUPABASE_SERVICE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
  };

  return NextResponse.json({ env, loaded: Object.keys(env).reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = env[key as keyof typeof env] != null;
    return acc;
  }, {}) });
}
