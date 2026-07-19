'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpenIcon, PlusIcon, SparklesIcon } from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  created_at: string;
  generation_type?: string | null;
  source?: string | null;
  is_immersive?: boolean;
}

type StatusFilter = 'all' | 'published' | 'draft';
type TypeFilter = 'all' | 'ai' | 'quick' | 'manual';

const PAGE_SIZE = 12;

function generationLabel(type?: string | null): string {
  if (type === 'ai') return 'AI';
  if (type === 'quick') return 'Quick';
  if (type === 'manual') return 'Manual';
  return 'Story';
}

function generationBadgeClass(type?: string | null): string {
  if (type === 'ai') return 'bg-[#fff0eb] text-[#a7391c] border-[#ffd4c8]';
  if (type === 'quick') return 'bg-[#f3eef8] text-[#520e33] border-[#e4d4ec]';
  if (type === 'manual') return 'bg-[#eef6f0] text-[#2d5a3d] border-[#cfe8d6]';
  return 'bg-[#fff8f5] text-[#524348] border-[#e9d7d0]';
}

function StoryRow({ story }: { story: Story }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-[#e9d7d0] bg-white p-5 transition hover:border-[#FF7956]/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-label-sm text-[10px] uppercase tracking-widest ${generationBadgeClass(story.generation_type)}`}
          >
            {generationLabel(story.generation_type)}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 font-label-sm text-[10px] uppercase tracking-widest ${
              story.status === 'published'
                ? 'border-[#cfe8d6] bg-[#eef6f0] text-[#2d5a3d]'
                : 'border-[#e9d7d0] bg-[#fff8f5] text-[#857278]'
            }`}
          >
            {story.status}
          </span>
        </div>
        <h3 className="font-headline-md text-[#1e1b18]">{story.title}</h3>
        {story.source && (
          <p className="mt-1 line-clamp-1 font-body-sm text-sm italic text-[#524348]">
            Source: {story.source}
          </p>
        )}
        <p className="mt-1 font-body-sm text-sm text-[#857278]">
          Added {new Date(story.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {story.status === 'draft' && (
          <Link
            href={`/parent/story/${story.id}/immersive`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#520e33] px-4 font-label-sm uppercase tracking-widest text-[#520e33] hover:bg-[#520e33] hover:text-white"
          >
            Continue setup
          </Link>
        )}
        {story.is_immersive && story.status === 'published' && (
          <Link
            href={`/parent/story/${story.id}/immersive`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#e9d7d0] px-4 font-label-sm uppercase tracking-widest text-[#520e33] hover:border-[#FF7956] hover:text-[#a7391c]"
          >
            Immersive →
          </Link>
        )}
      </div>
    </article>
  );
}

export default function ParentLibraryPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stories');
        if (res.ok) setStories(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, typeFilter, query]);

  const filteredStories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => {
      if (statusFilter !== 'all' && story.status !== statusFilter) return false;
      if (typeFilter !== 'all' && story.generation_type !== typeFilter) return false;
      if (!q) return true;
      return (
        story.title.toLowerCase().includes(q) ||
        (story.source?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [stories, statusFilter, typeFilter, query]);

  const visibleStories = filteredStories.slice(0, visibleCount);
  const hasMore = visibleCount < filteredStories.length;
  const draftCount = stories.filter((s) => s.status === 'draft').length;
  const publishedCount = stories.filter((s) => s.status === 'published').length;

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 font-label-sm uppercase tracking-widest text-[#857278]">Library</p>
            <h1 className="font-headline-lg text-headline-lg text-[#1e1b18]">Family stories</h1>
            <p className="mt-2 font-body-md text-[#524348]">
              {loading
                ? 'Loading your collection…'
                : `${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} · ${publishedCount} published · ${draftCount} draft`}
            </p>
          </div>
          <Link
            href="/parent/create-story"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
          >
            <SparklesIcon className="h-4 w-4" />
            New story
          </Link>
        </header>

        <div className="mb-6 rounded-2xl border border-[#e9d7d0] bg-white p-4 shadow-sm shadow-[#520e33]/5 md:p-5">
          <label className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or source…"
              className="h-12 w-full rounded-xl border border-[#d7c1c7] bg-[#fff8f5] px-4 font-body-md text-[#1e1b18] outline-none placeholder:text-[#857278] focus:border-[#FF7956]"
            />
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">Status</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'published', 'draft'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-full px-4 py-1.5 font-label-sm uppercase tracking-widest transition ${
                      statusFilter === key
                        ? 'bg-[#520e33] text-white'
                        : 'border border-[#e9d7d0] text-[#524348] hover:border-[#FF7956]/40'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">Type</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', 'All'],
                  ['ai', 'AI'],
                  ['quick', 'Quick'],
                  ['manual', 'Manual'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className={`rounded-full px-4 py-1.5 font-label-sm uppercase tracking-widest transition ${
                      typeFilter === key
                        ? 'bg-[#520e33] text-white'
                        : 'border border-[#e9d7d0] text-[#524348] hover:border-[#FF7956]/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-[#524348]">Loading stories…</p>
        ) : filteredStories.length === 0 ? (
          <div className="rounded-2xl border border-[#e9d7d0] bg-white p-10 text-center shadow-sm shadow-[#520e33]/5">
            <BookOpenIcon className="mx-auto mb-4 h-10 w-10 text-[#d7c1c7]" />
            <p className="font-body-md text-[#524348]">
              {stories.length === 0
                ? 'No stories yet. Create one with AI, expand a quick idea, or add from a book.'
                : 'No stories match these filters.'}
            </p>
            {stories.length === 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/parent/create-story"
                  className="rounded-xl bg-[#FF7956] px-4 py-2 font-label-sm uppercase tracking-widest text-white hover:bg-[#ee6744]"
                >
                  AI story
                </Link>
                <Link
                  href="/parent/add-story"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2d5a3d] px-4 py-2 font-label-sm uppercase tracking-widest text-[#2d5a3d] hover:bg-[#eef6f0]"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add from source
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 font-body-sm text-sm text-[#857278]">
              Showing {visibleStories.length} of {filteredStories.length}
            </p>
            <div className="space-y-3">
              {visibleStories.map((story) => (
                <StoryRow key={story.id} story={story} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="rounded-xl border border-[#520e33] px-5 py-2.5 font-label-sm uppercase tracking-widest text-[#520e33] hover:bg-[#520e33] hover:text-white"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
