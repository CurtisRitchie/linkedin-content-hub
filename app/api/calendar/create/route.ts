import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, slug, scheduled_for, status } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { message: "Title and slug are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          title,
          slug,
          scheduled_for,
          status: status || "draft",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { message: error.message || "Failed to create post." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { message: "Unexpected error while creating post." },
      { status: 500 }
    );
  }
}
