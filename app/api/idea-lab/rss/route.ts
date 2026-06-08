import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const RSS_FEEDS = [
  "https://www.junglescout.com/blog/feed/",
  "https://www.socialmediaexaminer.com/feed/",
  "https://www.marketingweek.com/feed/",
  "https://www.retailgazette.co.uk/feed/",
  "https://modernretail.co.uk/feed/",
  "https://www.aboutamazon.com/news/feed",
  "https://techcrunch.com/feed/",
  "https://sproutsocial.com/insights/feed/",
  "https://www.retaildive.com/feeds/news/",
  "https://econsultancy.com/feed/",
];

const FILTER_KEYWORDS = [
  "amazon",
  "tiktok",
  "tiktok shop",
  "marketplace",
  "ecommerce",
  "e-commerce",
  "retail media",
  "social commerce",
  "creator economy",
  "live shopping",
  "short-form video",
  "video commerce",
  "social selling",
  "creator",
  "influencer marketing",
  "seller central",
  "amazon ads",
  "sponsored ads",
  "dsp",
  "amazon prime",
  "fulfilment",
  "fba",
  "fbm",
  "vendor central",
  "shopping ads",
  "shop tab",
  "business",
  "marketing",
  "advertising",
  "campaign",
  "brand",
  "audience",
  "content",
  "growth",
  "strategy",
  "digital",
];

type FeedItem = {
  id: string;
  title: string;
  link: string;
  date: string;
  pubDate: string;
  description: string;
  source: string;
  timestamp: number;
};

const parser = new XMLParser({ ignoreAttributes: false });

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[(.*)\]\]>$/i, "$1").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function decodeHtmlEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    rsquo: "'",
    lsquo: "'",
    ldquo: '"',
    rdquo: '"',
    hellip: "...",
  };

  return value
    .replace(/&([a-zA-Z]+);/g, (_, name) => entities[name] ?? `&${name};`)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as any)["#text"]).trim();
  }
  return "";
}

const parseDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

function extractHtmlTag(sourceText: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i");
  return regex.exec(sourceText)?.[1]?.trim() ?? "";
}

function extractAttribute(sourceText: string, attribute: string): string {
  const regex = new RegExp(`${attribute}=["']([^"']+)["']`, "i");
  return regex.exec(sourceText)?.[1]?.trim() ?? "";
}

function normalizeHtmlItem(itemHtml: string, source: string, sourceName: string): FeedItem | null {
  let link = extractAttribute(itemHtml, "href");
  // try to find an <a href="..."> within the block if no direct attribute
  if (!link) {
    const anchorMatch = itemHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
    if (anchorMatch) link = anchorMatch[1];
  }

  // resolve relative links against the source URL when possible
  if (link) {
    try {
      link = new URL(link, source).toString();
    } catch (e) {
      // leave link as-is if URL resolution fails
    }
  }

  const title = stripHtml(
    stripCdata(
      decodeHtmlEntities(
        extractHtmlTag(itemHtml, "h2") || extractHtmlTag(itemHtml, "h3") || extractHtmlTag(itemHtml, "a") || ""
      )
    )
  ).trim();
  const timeTag = extractHtmlTag(itemHtml, "time");
  const rawDate = stripCdata(timeTag || extractAttribute(itemHtml, "datetime") || "");
  const rawDescription = stripHtml(stripCdata(extractHtmlTag(itemHtml, "p") || "")).slice(0, 200);
  const description = decodeHtmlEntities(rawDescription);
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;
  const date = parseDate(rawDate);

  // if still no link, fall back to the source page URL rather than dropping the item
  if (!link) {
    link = source;
  }

  return {
    id: `${source}:${link}`,
    title: title || "Untitled",
    link,
    date,
    pubDate: date,
    description,
    source: sourceName,
    timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
  };
}

function parseFeed(xmlText: string, source: string): FeedItem[] {
  try {
    const result = parser.parse(xmlText) as any;
    const channel = result?.rss?.channel;
    const items = channel?.item || [];
    const itemArray = Array.isArray(items) ? items : [items];
    const sourceName = normalizeField(channel?.title) || source;

    return itemArray
      .map((item: any) => {
        const title = stripCdata(decodeHtmlEntities(normalizeField(item?.title))) || "Untitled";
        const link = stripCdata(normalizeField(item?.link));
        const rawPubDate = stripCdata(normalizeField(item?.pubDate));
        const rawDescription = stripCdata(normalizeField(item?.description));
        const description = decodeHtmlEntities(stripHtml(rawDescription)).slice(0, 200);
        const timestamp = rawPubDate ? new Date(rawPubDate).getTime() : NaN;
        const date = parseDate(rawPubDate);

        if (!link) return null;

        return {
          id: `${source}:${link}`,
          title,
          link,
          date,
          pubDate: date,
          description,
          source: sourceName,
          timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
        };
      })
      .filter((item): item is FeedItem => item !== null);
  } catch (error) {
    console.error("RSS parse error", { source, error });
    return [];
  }
}

export async function GET() {
  const rssResults = await Promise.allSettled(
    RSS_FEEDS.map(async (feedUrl) => {
      try {
        const response = await fetch(feedUrl, { method: "GET" });
        const body = await response.text();

        console.log("RSS feed fetched", {
          feedUrl,
          status: response.status,
          statusText: response.statusText,
          preview: body.slice(0, 500),
        });

        if (!response.ok) {
          console.error("RSS fetch failed", { feedUrl, status: response.status, statusText: response.statusText });
          return [] as FeedItem[];
        }

        const items = parseFeed(body, feedUrl);
        console.log("RSS feed parsed", { feedUrl, itemCount: items.length });
        return items;
      } catch (error) {
        console.error("RSS fetch error", { feedUrl, error });
        return [] as FeedItem[];
      }
    })
  );

  const rssItems = rssResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const rawItems = [...rssItems];

  const rssCount = rssItems.length;
  const totalRaw = rawItems.length;
  console.log("Raw RSS items count", { rssCount, totalRaw, sampleSources: rawItems.slice(0, 10).map((i) => i.source) });

  const filtered = rawItems.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    const source = (item.source ?? "").toLowerCase();

    // Always include items that explicitly come from Amazon sources
    if (source.includes("amazon")) return true;

    return FILTER_KEYWORDS.some((keyword) => haystack.includes(keyword));
  });

  // Separate Amazon and TikTok/social commerce items
  const amazonKeywords = ["amazon", "fba", "seller", "vendor", "sponsored ads", "dsp"];
  const tiktokKeywords = ["tiktok", "social commerce", "creator", "influencer", "live shopping", "short-form"];

  const amazonItems = filtered
    .filter((item) => {
      const haystack = `${item.title} ${item.description}`.toLowerCase();
      const source = (item.source ?? "").toLowerCase();
      return source.includes("amazon") || amazonKeywords.some((kw) => haystack.includes(kw));
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  const tiktokItems = filtered
    .filter((item) => {
      const haystack = `${item.title} ${item.description}`.toLowerCase();
      return tiktokKeywords.some((kw) => haystack.includes(kw));
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  // Combine and sort by date, return up to 50 total
  const combined = [...amazonItems, ...tiktokItems]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  console.log("Filtered counts", {
    total: filtered.length,
    amazon: amazonItems.length,
    tiktok: tiktokItems.length,
    combined: combined.length,
    sampleCombinedSources: combined.slice(0, 10).map((i) => i.source),
  });

  const items = combined.map((i) => ({
    id: i.id,
    title: i.title,
    link: i.link,
    date: i.date ?? i.pubDate ?? "",
    pubDate: i.pubDate ?? i.date ?? "",
    description: i.description ?? "",
    source: i.source ?? "",
    timestamp: i.timestamp ?? 0,
  }));

  console.log('Sample item dates:', items.slice(0, 3).map((i) => ({ date: i.date, pubDate: i.pubDate, source: i.source })));

  return NextResponse.json({ items });
}
