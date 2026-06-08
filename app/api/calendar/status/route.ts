import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const STATUS_OPTIONS = [
  "draft",
  "writing",
  "ready",
  "sent to designer",
  "waiting",
  "scheduled",
  "published",
] as const;

type Status = (typeof STATUS_OPTIONS)[number];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { id, status } = body as { id?: string | number; status?: string };

  if (!id || typeof status !== "string" || !STATUS_OPTIONS.includes(status as Status)) {
    return NextResponse.json({ message: "Invalid post id or status." }, { status: 400 });
  }

  const { error } = await supabase.from("posts").update({ status }).eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Status updated." });
}
