import { supabase } from "../lib/supabase";
import IdeaLabBoard from "./idea-lab-board";

type SavedIdea = {
  id: string | number;
  title: string;
  status: string;
};

export default async function IdeaLabPage() {
  const { data: savedIdeas, error } = await supabase
    .from("posts")
    .select("id,title,status")
    .eq("status", "idea")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
            Idea Lab
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Discover trending content, saved ideas, and AI-generated prompts.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Browse the latest RSS intelligence, manage saved LinkedIn ideas, and generate fresh post concepts from OpenRouter.
          </p>
        </div>

        <IdeaLabBoard savedIdeas={savedIdeas ?? []} />
      </div>
    </div>
  );
}
