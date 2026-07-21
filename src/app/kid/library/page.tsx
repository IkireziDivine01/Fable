'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  PlayCircleIcon,
} from '@/components/HeroIcons';
import type { KidLibraryStory, StoryReadStatus } from '@/lib/stories-server';

type FilterTab = 'all' | 'new' | 'unread' | 'reading' | 'completed';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'unread', label: 'Unread' },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Finished' },
];

/** Warm cover palettes — brand-adjacent, never purple. */
const COVER_PALETTES = [
  { from: '#520e33', to: '#a7391c', ink: '#ffdbd2' },
  { from: '#a7391c', to: '#FF7956', ink: '#fff8f5' },
  { from: '#2d5a3d', to: '#5a8f6a', ink: '#eef6f0' },
  { from: '#6b3a2a', to: '#c4784a', ink: '#fff0eb' },
  { from: '#8a3a28', to: '#d4784a', ink: '#fff4ec' },
  { from: '#1e4a5c', to: '#3d7a8c', ink: '#e8f4f6' },
] as const;

function hashTitle(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function coverFor(title: string) {
  return COVER_PALETTES[hashTitle(title) % COVER_PALETTES.length];
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusLabel(status: StoryReadStatus, isFresh: boolean): string {
  if (status === 'completed') return 'Finished';
  if (status === 'reading') return 'Keep going';
  return isFresh ? 'Just in' : 'Not started';
}

function ctaLabel(status: StoryReadStatus): string {
  if (status === 'completed') return 'Read again';
  if (status === 'reading') return 'Continue';
  return 'Start';
}

function matchesFilter(story: KidLibraryStory, filter: FilterTab): boolean {
  if (filter === 'all') return true;
  if (filter === 'new') return story.readStatus === 'new' && story.isFresh;
  if (filter === 'unread') return story.readStatus === 'new';
  return story.readStatus === filter;
}

function BookCover({
  title,
  status,
  isFresh,
  size = 'md',
}: {
  title: string;
  status: StoryReadStatus;
  isFresh: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const palette = coverFor(title);
  const initial = title.trim().charAt(0).toUpperCase() || 'S';
  const dims =
    size === 'lg'
      ? 'h-44 w-[7.5rem] sm:h-52 sm:w-36'
      : size === 'sm'
        ? 'h-36 w-24'
        : 'h-40 w-[6.75rem] sm:h-44 sm:w-28';

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-r-md rounded-l-sm shadow-md ring-1 ring-black/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-[#520e33]/15 ${dims}`}
      style={{
        background: `linear-gradient(155deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
      aria-hidden
    >
      {/* Spine highlight */}
      <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
      <div className="absolute inset-y-0 left-2 w-px bg-white/20" />

      {/* Soft paper grain */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.2), transparent 45%)',
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-3 pl-4">
        <span
          className="font-headline-lg text-3xl leading-none opacity-90 sm:text-4xl"
          style={{ color: palette.ink }}
        >
          {initial}
        </span>
        <div>
          {(isFresh && status === 'new') || status === 'reading' || status === 'completed' ? (
            <span
              className="mb-1.5 inline-block rounded-md bg-black/25 px-1.5 py-0.5 font-body-sm text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm"
              style={{ color: palette.ink }}
            >
              {status === 'completed'
                ? 'Done'
                : status === 'reading'
                  ? 'Open'
                  : 'New'}
            </span>
          ) : null}
          <p
            className="line-clamp-3 font-headline-md text-[13px] leading-snug sm:text-sm"
            style={{ color: palette.ink }}
          >
            {title}
          </p>
        </div>
      </div>

      {status === 'completed' && (
        <CheckCircleIcon className="absolute right-2 top-2 h-5 w-5 text-white/90 drop-shadow" />
      )}
    </div>
  );
}

function ContinueHero({ story }: { story: KidLibraryStory }) {
  return (
    <Link
      href={`/kid/story/${story.id}`}
      className="group relative block overflow-hidden rounded-3xl bg-[#520e33] p-5 text-white shadow-lg shadow-[#520e33]/25 transition hover:shadow-xl hover:shadow-[#520e33]/30 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#FF7956]/40 blur-2xl transition group-hover:bg-[#FF7956]/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-[#ffdbd2]/20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-4 sm:gap-6">
        <BookCover
          title={story.title}
          status={story.readStatus}
          isFresh={story.isFresh}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="font-body-sm text-sm text-[#ffdbd2]">Pick up where you left off</p>
          <h2 className="mt-1 font-headline-md text-2xl leading-tight text-white sm:text-3xl">
            {story.title}
          </h2>
          {story.is_immersive && (
            <p className="mt-1.5 font-body-sm text-sm text-[#ffdbd2]/80">
              Immersive world waiting
            </p>
          )}
          <span className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#FF7956] px-5 font-body-md text-sm font-semibold text-white shadow-md shadow-black/20 transition group-hover:bg-[#ee6744] group-active:scale-[0.98]">
            <PlayCircleIcon className="h-5 w-5" />
            Continue story
          </span>
        </div>
      </div>
    </Link>
  );
}

function StoryCard({
  story,
  delayMs = 0,
}: {
  story: KidLibraryStory;
  delayMs?: number;
}) {
  return (
    <Link
      href={`/kid/story/${story.id}`}
      className="group animate-kid-rise flex w-[7.5rem] shrink-0 flex-col sm:w-32"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <BookCover
        title={story.title}
        status={story.readStatus}
        isFresh={story.isFresh}
      />
      <p className="mt-2.5 line-clamp-2 font-headline-md text-sm leading-snug text-[#1e1b18] group-hover:text-[#520e33]">
        {story.title}
      </p>
      <p className="mt-0.5 font-body-sm text-xs text-[#857278]">
        {statusLabel(story.readStatus, story.isFresh)}
        {story.is_immersive ? ' · 3D' : ''}
      </p>
      <span className="mt-1 font-body-sm text-xs font-medium text-[#520e33] opacity-0 transition group-hover:opacity-100">
        {ctaLabel(story.readStatus)} →
      </span>
    </Link>
  );
}

function StoryTile({
  story,
  delayMs = 0,
}: {
  story: KidLibraryStory;
  delayMs?: number;
}) {
  return (
    <Link
      href={`/kid/story/${story.id}`}
      className="group animate-kid-rise flex gap-3 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-[#e9d7d0]/90 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[#FF7956]/40 sm:p-3.5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <BookCover
        title={story.title}
        status={story.readStatus}
        isFresh={story.isFresh}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <p className="font-body-sm text-xs text-[#857278]">
          {statusLabel(story.readStatus, story.isFresh)}
          {story.is_immersive ? ' · Immersive' : ''}
        </p>
        <h3 className="mt-0.5 font-headline-md text-lg leading-snug text-[#1e1b18] group-hover:text-[#520e33]">
          {story.title}
        </h3>
        <span className="mt-3 inline-flex min-h-10 w-fit items-center rounded-xl bg-[#520e33] px-3.5 font-body-sm text-sm font-medium text-white transition group-hover:bg-[#6b1344]">
          {ctaLabel(story.readStatus)}
        </span>
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
      <h2 className="font-headline-md text-xl text-[#1e1b18] sm:text-2xl">{title}</h2>
      {hint ? <p className="font-body-sm text-xs text-[#857278]">{hint}</p> : null}
    </div>
  );
}

export default function KidLibraryPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Friend';
  const [stories, setStories] = useState<KidLibraryStory[]>([]);
  const [counts, setCounts] = useState({
    new: 0,
    unread: 0,
    reading: 0,
    completed: 0,
    total: 0,
  });
  const [stars, setStars] = useState({ starsThisWeek: 0, starsTotal: 0 });
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/kid/library');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load library');
        setStories(data.stories ?? []);
        setCounts(
          data.counts ?? { new: 0, unread: 0, reading: 0, completed: 0, total: 0 }
        );
        setStars(
          data.stars ?? { starsThisWeek: 0, starsTotal: 0 }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(
    () => stories.filter((s) => matchesFilter(s, filter)),
    [filter, stories]
  );

  const continueReading = stories.filter((s) => s.readStatus === 'reading');
  const freshNew = stories.filter((s) => s.readStatus === 'new' && s.isFresh);
  const otherUnread = stories.filter((s) => s.readStatus === 'new' && !s.isFresh);
  const finished = stories.filter((s) => s.readStatus === 'completed');
  const featuredContinue = continueReading[0] ?? null;
  const moreContinue = continueReading.slice(1);

  const filterCount = (id: FilterTab) => {
    if (id === 'all') return counts.total;
    if (id === 'new') return counts.new;
    if (id === 'unread') return counts.unread;
    if (id === 'reading') return counts.reading;
    return counts.completed;
  };

  return (
    <div>
      <header className="mb-6 animate-kid-rise sm:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body-md text-sm text-[#857278]">
              {greeting}, {firstName}
            </p>
            <h1 className="mt-1 font-headline-lg text-[2rem] leading-tight text-[#520e33] sm:text-4xl">
              What shall we read?
            </h1>
          </div>
          {!loading && (
            <div
              className="shrink-0 rounded-2xl border-2 border-[#FF7956]/35 bg-[#fff8f5] px-3 py-2 text-center shadow-sm"
              title="Letter Party stars"
            >
              <p
                className="text-2xl leading-none text-[#FF7956] sm:text-3xl"
                style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
              >
                {stars.starsTotal}★
              </p>
              <p className="mt-0.5 font-body-sm text-[10px] uppercase tracking-wide text-[#857278]">
                {stars.starsThisWeek > 0
                  ? `+${stars.starsThisWeek} this week`
                  : 'your stars'}
              </p>
            </div>
          )}
        </div>
        {!loading && counts.total > 0 && (
          <p className="mt-2 max-w-lg font-body-md text-[#524348]">
            {counts.completed > 0
              ? `You’ve finished ${counts.completed} stor${counts.completed === 1 ? 'y' : 'ies'}. `
              : 'Your family shelf is ready. '}
            {counts.reading > 0
              ? `${counts.reading} still waiting for you to continue.`
              : counts.new > 0
                ? `${counts.new} new adventure${counts.new === 1 ? '' : 's'} just arrived.`
                : counts.unread > 0
                  ? `${counts.unread} waiting to be opened.`
                  : 'Tap a book to begin.'}
          </p>
        )}
      </header>

      {error && (
        <p className="mb-6 rounded-2xl bg-[#fff0eb] px-4 py-3 font-body-md text-[#a7391c]" role="alert">
          {error}
        </p>
      )}

      {!loading && stories.length > 0 && (
        <div
          className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter stories"
        >
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            const count = filterCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`shrink-0 rounded-2xl px-4 py-2.5 font-body-md text-sm font-medium transition ${
                  active
                    ? 'bg-[#520e33] text-white shadow-md shadow-[#520e33]/20'
                    : 'bg-white/80 text-[#524348] ring-1 ring-[#e9d7d0] hover:ring-[#520e33]/40'
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
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-3xl bg-[#e9d7d0]/50" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 w-28 shrink-0 animate-pulse rounded-md bg-[#e9d7d0]/40"
              />
            ))}
          </div>
        </div>
      ) : stories.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-white/90 px-6 py-14 text-center shadow-sm ring-1 ring-[#e9d7d0]">
          <div
            className="pointer-events-none absolute -right-6 top-4 h-24 w-24 rounded-full bg-[#ffdbd2]/60 blur-xl"
            aria-hidden
          />
          <div className="animate-kid-wiggle mx-auto mb-5 flex h-20 w-16 items-center justify-center rounded-r-md rounded-l-sm bg-gradient-to-br from-[#520e33] to-[#FF7956] shadow-md">
            <BookOpenIcon className="h-8 w-8 text-[#ffdbd2]" />
          </div>
          <h2 className="font-headline-md text-2xl text-[#1e1b18]">Your shelf is waiting</h2>
          <p className="mx-auto mt-2 max-w-sm font-body-md text-[#524348]">
            Ask a parent or elder to publish a story — then it will appear here like magic.
          </p>
        </div>
      ) : filter === 'all' ? (
        <div className="space-y-9">
          {featuredContinue && (
            <section className="animate-kid-rise">
              <ContinueHero story={featuredContinue} />
              {moreContinue.length > 0 && (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {moreContinue.map((story, i) => (
                    <StoryCard key={story.id} story={story} delayMs={80 + i * 60} />
                  ))}
                </div>
              )}
            </section>
          )}

          {freshNew.length > 0 && (
            <section>
              <SectionHeader title="New for you" hint="Fresh from your family" />
              <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {freshNew.map((story, i) => (
                  <StoryCard key={story.id} story={story} delayMs={i * 70} />
                ))}
              </div>
            </section>
          )}

          {otherUnread.length > 0 && (
            <section>
              <SectionHeader title="Still to open" hint="Waiting on your shelf" />
              <div className="grid gap-3 sm:grid-cols-2">
                {otherUnread.map((story, i) => (
                  <StoryTile key={story.id} story={story} delayMs={i * 50} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section>
              <SectionHeader
                title="Stories you’ve finished"
                hint="Tap any to read again"
              />
              <div className="flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {finished.map((story, i) => (
                  <StoryCard key={story.id} story={story} delayMs={i * 60} />
                ))}
              </div>
            </section>
          )}

          {!featuredContinue &&
            freshNew.length === 0 &&
            otherUnread.length === 0 &&
            finished.length > 0 && null}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center font-body-md text-[#524348]">
          Nothing in this pile yet — try another filter.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((story, i) => (
            <StoryTile key={story.id} story={story} delayMs={i * 45} />
          ))}
        </div>
      )}
    </div>
  );
}
