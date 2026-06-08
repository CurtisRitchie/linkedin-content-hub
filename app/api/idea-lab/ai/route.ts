import { NextResponse } from "next/server";

const PILLARS = ["Amazon marketplace strategy", "TikTok Shop growth"];

function normalizeAiContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.join("\n");
  if (content && typeof content === "object") {
    if (typeof (content as any).text === "string") return (content as any).text;
    if (typeof (content as any).content === "string") return (content as any).content;
    if (Array.isArray((content as any).content)) return (content as any).content.join("\n");
  }
  return String(content ?? "");
}

function parseIdeas(content: string): string[] {
  const normalized = content
    .replace(/\r/g, "")
    .replace(/\s*•\s*/g, "")
    .trim();

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[\d\-\)\.]+\s*/, "").trim())
    .filter(Boolean);

  if (lines.length >= 5) {
    return lines.slice(0, 5);
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 5);
}

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY?.trim();

  if (!key) {
    const fallbackIdeas = [
      "Amazon strategy: 5 steps to improve product discoverability on Amazon and increase conversions.",
      "TikTok Shop growth: How to turn short-form video trends into a high-performing social commerce funnel.",
      "Retail media: Using retailer ad platforms to boost brand presence and drive omnichannel sales.",
      "Amazon strategy: Leveraging reviews and A+ content to win in crowded categories.",
      "TikTok Shop growth: Creative community-first campaigns that convert viewers into buyers.",
    ];

    return NextResponse.json({
      ideas: fallbackIdeas,
      fallback: true,
      message: "OPENROUTER_API_KEY was not loaded. Returning fallback AI ideas for testing.",
    });
  }

  const prompt = `You are an expert LinkedIn content strategist. Generate 5 concise LinkedIn post ideas, one idea per line, tailored to these content pillars: ${PILLARS.join(", ")}. Keep each idea short and compelling for a business audience.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a talented LinkedIn copywriter." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter request failed", {
        status: response.status,
        statusText: response.statusText,
        body: text,
      });
      let message = "Failed to generate AI ideas.";
      try {
        const payload = JSON.parse(text);
        message = payload?.message ?? payload?.error ?? message;
      } catch {
        message = text || message;
      }
      return NextResponse.json(
        {
          message,
          status: response.status,
          statusText: response.statusText,
          detail: text,
        },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content ?? payload?.output?.[0]?.data?.content ?? "";
    const content = normalizeAiContent(rawContent);
    const ideas = parseIdeas(content);

    return NextResponse.json({ ideas, fallback: false });
  } catch (error) {
    console.error("OpenRouter request error", error);
    return NextResponse.json(
      {
        message: "Unexpected error while generating AI ideas.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
