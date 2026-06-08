'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const browserSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Post = {
  id: string | number;
  title: string;
  status: string;
  scheduled_date: string;
};

type Status = 'draft' | 'writing' | 'ready' | 'sent to designer' | 'waiting' | 'scheduled' | 'published';

const STATUS_OPTIONS: Status[] = [
  'draft',
  'writing',
  'ready',
  'sent to designer',
  'waiting',
  'scheduled',
  'published',
];

const statusColors: Record<Status, string> = {
  draft: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  writing: 'bg-blue-200 text-blue-800 hover:bg-blue-300',
  ready: 'bg-green-200 text-green-800 hover:bg-green-300',
  'sent to designer': 'bg-purple-200 text-purple-800 hover:bg-purple-300',
  waiting: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300',
  scheduled: 'bg-orange-200 text-orange-800 hover:bg-orange-300',
  published: 'bg-green-800 text-green-100 hover:bg-green-900',
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      dateString: date.toISOString().split('T')[0],
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dateNum: date.getDate(),
    });
  }
  return days;
}

interface CalendarBoardProps {
  posts: Post[];
}

export default function CalendarBoard({ posts: initialPosts = [] }: CalendarBoardProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft' as Status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekDays = getWeekDays();

  useEffect(() => {
    setPosts(initialPosts);
  }, []);

  const getPostsForDay = (dateString: string) => {
    return posts.filter((post) => post.scheduled_date === dateString);
  };

  const handleSavePost = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const slug = generateSlug(formData.title);
      console.log('Attempting to save post:', { title: formData.title, slug, status: formData.status, scheduled_date: formData.date });
      
      const { data, error: insertError } = await browserSupabase
        .from('posts')
        .insert([
          {
            title: formData.title,
            slug,
            status: formData.status,
            scheduled_date: formData.date,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (insertError) {
        console.error('❌ Supabase insert error:', insertError);
        console.error('Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw new Error(`${insertError.message} (Code: ${insertError.code})`);
      }

      console.log('✅ Post saved successfully:', data);
      if (data && data[0]) {
        setPosts([...posts, data[0]]);
      }

      setShowModal(false);
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save post';
      console.error('❌ Save error caught:', err);
      console.error('Error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCycleStatus = async (post: Post) => {
    const currentIndex = STATUS_OPTIONS.indexOf(post.status as Status);
    const nextStatus = STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length];

    try {
      const { error: updateError } = await browserSupabase
        .from('posts')
        .update({ status: nextStatus })
        .eq('id', post.id);

      if (updateError) {
        throw updateError;
      }

      setPosts(
        posts.map((p) =>
          p.id === post.id ? { ...p, status: nextStatus } : p
        )
      );
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            + New Post
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayPosts = getPostsForDay(day.dateString);
            return (
              <div
                key={day.dateString}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                {/* Day Header */}
                <div className="mb-4 border-b border-gray-200 pb-3">
                  <p className="text-sm font-semibold uppercase text-gray-500">
                    {day.day}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {day.dateNum}
                  </p>
                </div>

                {/* Posts */}
                <div className="flex-1 space-y-2">
                  {dayPosts.length === 0 ? (
                    <p className="text-xs text-gray-400">No posts</p>
                  ) : (
                    dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <p className="mb-2 text-sm font-semibold text-gray-900">
                          {post.title}
                        </p>
                        <button
                          onClick={() => handleCycleStatus(post)}
                          className={`inline-block cursor-pointer rounded-full px-2 py-1 text-xs font-semibold transition ${
                            statusColors[post.status as Status] ||
                            'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {post.status}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">New Post</h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter post title"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Status Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Status })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={loading || !formData.title.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
