"use client";

import { useEffect, useMemo, useState } from "react";

type SavedIdea = {
  id: string | number;
  title: string;
  status: string;
};

type TrendingItem = {
  id: string;
  title: string;
  link: string;
  feedTitle: string;
  date?: string;
  pubDate?: string;
  publishedAt?: string;
  description?: string;
  source?: string;
  timestamp?: number;
};

type IdeaLabBoardProps = {
  savedIdeas: SavedIdea[];
};

const TABS = ["Trending", "Saved", "AI Ideas"] as const;
const FILTER_TOPICS = ["Amazon", "TikTok Shop"] as const;

type TabLabel = (typeof TABS)[number];

type TopicFilter = "" | (typeof FILTER_TOPICS)[number];

function matchesFilter(text: string, filter: TopicFilter) {
  if (!filter) return true;
  const normalizedText = text.toLowerCase();
  if (filter === "Amazon") {
    return normalizedText.includes("amazon");
  }
  if (filter === "TikTok Shop") {
    return [
      "tiktok",
      "creator",
      "influencer",
      "video commerce",
      "short-form",
      "live stream",
      "social selling",
      "shop now",
      "viral",
      "content creator",
    ].some((keyword) => normalizedText.includes(keyword));
  }
  return false;
}

export default function IdeaLabBoard({ savedIdeas }: IdeaLabBoardProps) {
  const [activeTab, setActiveTab] = useState<TabLabel>("Trending");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("");
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredSavedIdeas = useMemo(
    () =>
      savedIdeas.filter((idea) =>
        topicFilter === ""
          ? true
          : matchesFilter(`${idea.title} ${idea.status}`, topicFilter)
      ),
    [savedIdeas, topicFilter]
  );

  const filteredTrendingItems = useMemo(() => {
    if (!topicFilter) return trendingItems;

    return trendingItems.filter((item) => {
      const title = (item.title ?? "").toLowerCase();
      const desc = (item.description ?? "").toLowerCase();
      const source = (item.source ?? "").toLowerCase();

      if (topicFilter === "Amazon") {
        return source.includes("amazon") || title.includes("amazon") || desc.includes("amazon");
      }

      if (topicFilter === "TikTok Shop") {
        if (source.toLowerCase().includes("tiktok") === true) return true;

        const keywords = [
          "tiktok",
          "creator",
          "influencer",
          "social commerce",
          "live shopping",
          "short-form",
          "video commerce",
          "social selling",
        ];

        return keywords.some((keyword) =>
          title.includes(keyword) || desc.includes(keyword)
        );
      }

      return true;
    });
  }, [trendingItems, topicFilter]);

  useEffect(() => {
    if (activeTab !== "Trending" || trendingItems.length > 0) return;
    setTrendingLoading(true);
    setTrendingError(null);

    fetch("/api/idea-lab/rss")
      .then(async (res) => {
        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(errorBody?.message ?? "Failed to fetch trending feeds.");
        }
        return res.json();
      })
      .then((data) => {
        setTrendingItems(data.items ?? []);
      })
      .catch((error) => {
        setTrendingError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setTrendingLoading(false));
  }, [activeTab, trendingItems.length]);

  useEffect(() => {
    if (activeTab !== "AI Ideas" || aiIdeas.length > 0) return;
    setAiLoading(true);
    setAiError(null);

    fetch("/api/idea-lab/ai")
      .then(async (res) => {
        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(errorBody?.message ?? "Failed to generate AI ideas.");
        }
        return res.json();
      })
      .then((data) => {
        setAiIdeas(data.ideas ?? []);
      })
      .catch((error) => {
        setAiError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setAiLoading(false));
  }, [activeTab, aiIdeas.length]);

  return (
    <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
            Idea Lab
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Explore trending posts, saved ideas, and AI-generated inspiration.
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setTopicFilter(topicFilter === topic ? "" : topic)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                topicFilter === topic
                  ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-900"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-3xl bg-slate-50 p-2 dark:bg-slate-950/60">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-50"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Trending" ? (
        <section className="space-y-4">
          {trendingLoading ? (
            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              Loading trending feeds...
            </div>
          ) : trendingError ? (
            <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/20 dark:text-rose-200">
              {trendingError}
            </div>
          ) : filteredTrendingItems.length === 0 ? (
            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              No trending posts found for this topic.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredTrendingItems.map((item) => (
                <article key={item.id} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.feedTitle}</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{item.title}</h3>
                    </div>
                    <time className="text-xs text-slate-500 dark:text-slate-400">
                      {item.date ?? "Unknown date"}
                    </time>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item.description ?? "No description available."}
                  </p>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-sky-600 transition hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200"
                  >
                    Read full post
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === "Saved" ? (
        <section className="space-y-4">
          {filteredSavedIdeas.length === 0 ? (
            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              No saved ideas available. Save more ideas in Supabase with status set to "idea".
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredSavedIdeas.map((idea) => (
                <article key={idea.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{idea.title}</h3>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {idea.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {aiLoading ? (
            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              Generating AI ideas...
            </div>
          ) : aiError ? (
            <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/20 dark:text-rose-200">
              {aiError}
            </div>
          ) : aiIdeas.length === 0 ? (
            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              AI ideas will appear here once the tab loads.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {aiIdeas.map((idea, index) => (
                <article key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Idea {index + 1}</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{idea}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
