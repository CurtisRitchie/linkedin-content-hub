import { supabase } from "../lib/supabase";
import CalendarBoard from "./calendar-board";

type CalendarPost = {
  id: string | number;
  title: string;
  status: string;
  date: string;
};

type WeekDay = {
  label: string;
  full: string;
  date: string;
  index: number;
};

const STATUS_OPTIONS = [
  "draft",
  "writing",
  "ready",
  "sent to designer",
  "waiting",
  "scheduled",
  "published",
] as const;

function getCurrentWeekDays(): WeekDay[] {
  const today = new Date();
  const monday = new Date(today);
  const diff = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
      full: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      date: date.toISOString().slice(0, 10),
      index,
    };
  });
}

function parsePostDate(post: any): Date | null {
  const dateFields = ["scheduled_for", "published_at", "created_at"];
  for (const field of dateFields) {
    const value = post[field];
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function getDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function isSameWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return date >= weekStart && date <= weekEnd;
}

function getWeekStart(today: Date): Date {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  const diff = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - diff);
  return monday;
}

export default async function CalendarPage() {
  const { data, error } = await supabase.from("posts").select("*");

  if (error) {
    throw new Error(error.message);
  }

  const weekDays = getCurrentWeekDays();
  const weekStart = getWeekStart(new Date());
  const postsByDay: Record<string, CalendarPost[]> = weekDays.reduce(
    (acc, day) => ({ ...acc, [day.index]: [] }),
    {}
  );

  if (Array.isArray(data)) {
    for (const item of data) {
      const date = parsePostDate(item);
      if (!date || !isSameWeek(date, weekStart)) {
        continue;
      }

      const dayIndex = getDayIndex(date);
      const key = String(dayIndex);
      const post: CalendarPost = {
        id: item.id,
        title: item.title ?? "Untitled post",
        status: STATUS_OPTIONS.includes(item.status) ? item.status : "draft",
        date: date.toISOString(),
      };

      postsByDay[key] = [...postsByDay[key], post];
    }
  }

  // Flatten posts for CalendarBoard component
  const posts = Object.values(postsByDay).flat();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
              Content Calendar
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Weekly editorial plan
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
              Review posts for the current week and update the status of each item inline.
            </p>
          </div>
        </div>

        <CalendarBoard posts={posts} />
      </div>
    </div>
  );
}
