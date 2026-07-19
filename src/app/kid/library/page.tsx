'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  HandRaisedIcon,
  LightBulbIcon,
  PlayCircleIcon,
} from '@/components/HeroIcons';
import type { KidLibraryStory, StoryReadStatus } from '@/lib/stories-server';

type FilterTab = 'all' | 'new' | 'reading' | 'completed';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Finished' },
];

function statusMeta(status: StoryReadStatus) {
  if (status === 'completed') {
    return {
      label: 'Finished',
      className: 'bg-[#eef6f0] text-[#2d5a3d]',
      Icon: CheckCircleIcon,
    };
  }
  if (status === 'reading') {
    return {
      label: 'Keep going',
      className: 'bg-[#fff0eb] text-[#a7391c]',
      Icon: ClockIcon,
    };
  }
  return {
    label: 'New',
    className: 'bg-[#ffdbd2] text-[#520e33]',
    Icon: SparkBadge,
  };
}

function SparkBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full bg-current ${className ?? ''}`} />
  );
}

function StoryCard({ story }: { story: KidLibraryStory }) {
  const meta = statusMeta(story.readStatus);
  const StatusIcon = meta.Icon;
  const cta =
    story.readStatus === 'completed'
      ? 'Read again'
      : story.readStatus === 'reading'
        ? 'Continue'
        : 'Start';

  return (
    <article className="group flex flex-col rounded-2xl border border-[#e9d7d0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FF7956]/40 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-sm text-[10px] uppercase tracking-widest ${meta.className}`}
        >
          {story.readStatus === 'new' ? (
            <SparkBadge />
          ) : (
            <StatusIcon className="h-3.5 w-3.5" />
          )}
          {meta.label}
        </span>
        {story.is_immersive && (
          <span className="rounded-full bg-[#520e33] px-2.5 py-1 font-label-sm text-[10px] uppercase tracking-widest text-[#ffdbd2]">
            Immersive
          </span>
        )}
      </div>

      <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-[#fff8f5] ring-1 ring-[#e9d7d0] transition group-hover:bg-[#ffdbd2]/25">
        {story.readStatus === 'completed' ? (
          <CheckCircleIcon className="h-9 w-9 text-[#2d5a3d]" />
        ) : story.readStatus === 'reading' ? (
          <PlayCircleIcon className="h-9 w-9 text-[#FF7956]" />
        ) : (
          <BookOpenIcon className="h-9 w-9 text-[#FF7956]" />
        )}
      </div>

      <h3 className="flex-1 font-headline-md text-xl leading-snug text-[#1e1b18] group-hover:text-[#520e33]">
        {story.title}
      </h3>

      <Link
        href={`/kid/story/${story.id}`}
        className="mt-4 block min-h-11 rounded-xl bg-[#520e33] px-4 py-2.5 text-center font-label-sm uppercase tracking-widest text-white transition hover:bg-[#6b1344]"
      >
        {cta}
      </Link>
    </article>
  );
}

export default function KidLibraryPage() {
  const [stories, setStories] = useState<KidLibraryStory[]>([]);
  const [counts, setCounts] = useState({ new: 0, reading: 0, completed: 0, total: 0 });
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/kid/library');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setStories(data.stories ?? []);
        setCounts(data.counts ?? { new: 0, reading: 0, completed: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return stories;
    return stories.filter((s) => s.readStatus === filter);
  }, [filter, stories]);

  const continueReading = stories.filter((s) => s.readStatus === 'reading');
  const brandNew = stories.filter((s) => s.readStatus === 'new');

  return (
    <div>
      <header className="mb-6">
        <p className="font-label-sm uppercase tracking-[0.22em] text-[#857278]">
          Akarima k&apos;inkuru · Your shelf
        </p>
        <h1 className="mt-1 font-headline-lg text-3xl text-[#1e1b18] md:text-4xl">
          Your stories
        </h1>
        <p className="mt-2 max-w-lg font-body-md text-[#524348]">
          New stories wait for you. Pick up where you left off, or revisit ones you finished.
        </p>
      </header>

      <Link
        href="/kid/waruziko"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-[#C4A574]/50 bg-gradient-to-r from-[#520e33] to-[#6b1344] p-4 text-[#fff8f5] shadow-md transition hover:brightness-110"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF7956]/25">
          <LightBulbIcon className="h-6 w-6 text-[#FF7956]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-label-sm uppercase tracking-widest text-[#ffdbd2]/80">
            Waruziko
          </span>
          <span className="block font-headline-md text-lg">Today&apos;s cultural fact</span>
        </span>
        <span className="font-label-sm uppercase tracking-widest text-[#C4A574]">Open →</span>
      </Link>

      {!loading && stories.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'New', value: counts.new, tone: 'text-[#520e33]' },
            { label: 'Reading', value: counts.reading, tone: 'text-[#a7391c]' },
            { label: 'Finished', value: counts.completed, tone: 'text-[#2d5a3d]' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#e9d7d0] bg-white px-3 py-3 text-center shadow-sm"
            >
              <p className={`font-headline-md text-2xl ${stat.tone}`}>{stat.value}</p>
              <p className="font-label-sm text-[10px] uppercase tracking-widest text-[#857278]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((tab) => {
          const active = filter === tab.id;
          const count =
            tab.id === 'all'
              ? counts.total
              : tab.id === 'new'
                ? counts.new
                : tab.id === 'reading'
                  ? counts.reading
                  : counts.completed;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 rounded-full px-4 py-2 font-label-sm uppercase tracking-widest transition ${
                active
                  ? 'bg-[#520e33] text-white'
                  : 'border border-[#e9d7d0] bg-white text-[#524348] hover:border-[#520e33]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${active ? 'text-[#ffdbd2]' : 'text-[#857278]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="font-body-md text-[#524348]">Opening the shelf…</p>
      ) : stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e9d7d0] bg-white p-10 text-center">
          <HandRaisedIcon className="mx-auto mb-4 h-12 w-12 text-[#d7c1c7]" />
          <h2 className="font-headline-md text-xl text-[#1e1b18]">Nothing here yet</h2>
          <p className="mt-2 font-body-md text-[#524348]">
            When your family publishes stories, they will appear on this shelf.
          </p>
        </div>
      ) : filter === 'all' ? (
        <div className="space-y-8">
          {continueReading.length > 0 && (
            <section>
              <h2 className="mb-3 font-headline-md text-xl text-[#1e1b18]">Continue reading</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {continueReading.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </section>
          )}

          {brandNew.length > 0 && (
            <section>
              <h2 className="mb-3 font-headline-md text-xl text-[#1e1b18]">New for you</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {brandNew.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </section>
          )}

          {counts.completed > 0 && (
            <section>
              <h2 className="mb-3 font-headline-md text-xl text-[#1e1b18]">Finished</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stories
                  .filter((s) => s.readStatus === 'completed')
                  .map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
              </div>
            </section>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e9d7d0] bg-white p-8 text-center">
          <p className="font-body-md text-[#524348]">No stories in this shelf yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
