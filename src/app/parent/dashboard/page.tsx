'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  SparklesIcon,
} from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  created_at: string;
  generation_type?: string | null;
  source?: string | null;
  is_immersive?: boolean;
}

interface LearnerSummary {
  id: string;
  name: string;
  storiesReadThisWeek: number;
  accountStatus?: string;
}

interface ReadingActivityItem {
  id: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED';
  timestamp: string;
}

interface ActivityData {
  learners: LearnerSummary[];
  recentActivity: ReadingActivityItem[];
  totalReadsThisWeek: number;
}

type LibraryFilter = 'all' | 'published' | 'draft';

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

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function LearnerActivityPanel({
  activity,
  loading,
}: {
  activity: ActivityData | null;
  loading: boolean;
}) {
  const completedEvents = useMemo(
    () =>
      (activity?.recentActivity ?? []).filter((item) => item.eventType === 'STORY_COMPLETED'),
    [activity]
  );

  return (
    <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase tracking-widest text-[#857278]">Learner activity</p>
          <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">What they&apos;ve been reading</h2>
        </div>
        <Link
          href="/parent/family"
          className="shrink-0 font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
        >
          Family →
        </Link>
      </div>

      {loading ? (
        <p className="text-[#524348]">Loading activity…</p>
      ) : !activity || activity.learners.length === 0 ? (
        <div className="rounded-xl bg-[#fff8f5] p-6 text-center">
          <p className="font-body-md text-[#524348]">No learners in your household yet.</p>
          <Link
            href="/parent/family"
            className="mt-3 inline-block font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
          >
            Invite a learner →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {activity.learners.map((learner) => (
              <div
                key={learner.id}
                className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] px-4 py-3"
              >
                <p className="font-headline-md text-[#520e33]">{learner.name}</p>
                {learner.accountStatus === 'pending' ? (
                  <p className="mt-1 font-body-sm text-sm text-[#a7391c]">Awaiting your approval</p>
                ) : (
                  <p className="mt-1 font-body-sm text-sm text-[#857278]">
                    {learner.storiesReadThisWeek === 0
                      ? 'No stories finished this week'
                      : `${learner.storiesReadThisWeek} finished this week`}
                  </p>
                )}
              </div>
            ))}
          </div>

          {completedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e9d7d0] p-6 text-center">
              <ClockIcon className="mx-auto mb-3 h-8 w-8 text-[#d7c1c7]" />
              <p className="font-body-md text-[#524348]">
                Reading history will appear here once learners finish stories.
              </p>
            </div>
          ) : (
            <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {completedEvents.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                >
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2d5a3d]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-body-md text-[#1e1b18]">
                      <span className="font-semibold text-[#520e33]">{item.kidName}</span> finished{' '}
                      <span className="font-semibold">{item.storyTitle}</span>
                    </p>
                    <p className="mt-1 font-body-sm text-sm text-[#857278]">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <article className="group flex flex-col rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-5 transition hover:border-[#FF7956]/40 hover:shadow-md hover:shadow-[#520e33]/5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 font-label-sm text-[10px] uppercase tracking-widest ${generationBadgeClass(story.generation_type)}`}
        >
          {generationLabel(story.generation_type)}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-label-sm text-[10px] uppercase tracking-widest ${
            story.status === 'published'
              ? 'border-[#cfe8d6] bg-[#eef6f0] text-[#2d5a3d]'
              : 'border-[#e9d7d0] bg-white text-[#857278]'
          }`}
        >
          {story.status}
        </span>
      </div>

      <h3 className="font-headline-md text-[#1e1b18]">{story.title}</h3>

      {story.source && (
        <p className="mt-2 line-clamp-2 font-body-sm text-sm italic text-[#524348]">
          Source: {story.source}
        </p>
      )}

      <p className="mt-2 font-body-sm text-sm text-[#857278]">
        Added {new Date(story.created_at).toLocaleDateString()}
      </p>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {story.status === 'draft' && (
          <Link
            href={`/parent/story/${story.id}/immersive`}
            className="inline-flex min-h-9 items-center rounded-lg border border-[#520e33] px-3 font-label-sm uppercase tracking-widest text-[#520e33] hover:bg-[#520e33] hover:text-white"
          >
            Continue setup
          </Link>
        )}
        {story.is_immersive && story.status === 'published' && (
          <Link
            href={`/parent/story/${story.id}/immersive`}
            className="inline-flex min-h-9 items-center font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
          >
            Immersive →
          </Link>
        )}
      </div>
    </article>
  );
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [filter, setFilter] = useState<LibraryFilter>('all');

  useEffect(() => {
    async function load() {
      try {
        const [storiesRes, activityRes] = await Promise.all([
          fetch('/api/stories'),
          fetch('/api/parent/activity'),
        ]);
        if (storiesRes.ok) setStories(await storiesRes.json());
        if (activityRes.ok) setActivity(await activityRes.json());
      } finally {
        setLoadingStories(false);
        setLoadingActivity(false);
      }
    }
    load();
  }, []);

  const filteredStories = useMemo(() => {
    if (filter === 'published') return stories.filter((s) => s.status === 'published');
    if (filter === 'draft') return stories.filter((s) => s.status === 'draft');
    return stories;
  }, [stories, filter]);

  const publishedCount = stories.filter((s) => s.status === 'published').length;
  const learnerCount = activity?.learners.length ?? 0;

  return (
    <main className="min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      <AppHeader title="Parent home" subtitle="Household overview" />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {/* Hero */}
        <div className="mb-10 rounded-3xl border border-[#e9d7d0] bg-gradient-to-br from-white via-white to-[#fff0eb]/40 p-8 shadow-sm shadow-[#520e33]/5 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 font-label-md uppercase tracking-[0.2em] text-[#33001d]">
                Welcome back
              </p>
              <h1 className="font-headline-xl text-headline-xl">
                {session?.user?.name ?? 'Parent'}, your library awaits.
              </h1>
              <p className="mt-3 max-w-xl font-body-md text-[#524348]">
                See what your learners are reading, add stories from books and oral tradition, and
                keep every tale in one protected place.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <Link
                href="/parent/create-story"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
              >
                <SparklesIcon className="h-4 w-4" />
                AI story
              </Link>
              <Link
                href="/parent/quick-story"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#520e33] px-5 font-label-md text-[#520e33] hover:border-[#FF7956] hover:text-[#a7391c]"
              >
                Quick 2-sentence
              </Link>
              <Link
                href="/parent/add-story"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#2d5a3d] bg-[#eef6f0] px-5 font-label-md text-[#2d5a3d] hover:bg-[#dfece3]"
              >
                <PlusIcon className="h-4 w-4" />
                Add from source
              </Link>
              <Link
                href="/parent/family"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#520e33] px-5 font-label-md tracking-widest text-white hover:bg-[#3c0826]"
              >
                Family
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Stories in library', value: loadingStories ? '—' : stories.length },
            { label: 'Published', value: loadingStories ? '—' : publishedCount },
            {
              label: 'Finished this week',
              value: loadingActivity ? '—' : (activity?.totalReadsThisWeek ?? 0),
            },
            { label: 'Learners', value: loadingActivity ? '—' : learnerCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#e9d7d0] bg-white p-5 shadow-sm shadow-[#520e33]/5"
            >
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">{stat.label}</p>
              <p className="mt-2 font-headline-md text-headline-md text-[#520e33]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main grid: activity + library */}
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <LearnerActivityPanel activity={activity} loading={loadingActivity} />
          </div>

          <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7 lg:col-span-3">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-label-sm uppercase tracking-widest text-[#857278]">Your library</p>
                <h2 className="mt-1 font-headline-md text-headline-md">Family stories</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'published', 'draft'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-4 py-1.5 font-label-sm uppercase tracking-widest transition ${
                      filter === key
                        ? 'bg-[#520e33] text-white'
                        : 'border border-[#e9d7d0] text-[#524348] hover:border-[#FF7956]/40'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {loadingStories ? (
              <p className="text-[#524348]">Loading stories…</p>
            ) : filteredStories.length === 0 ? (
              <div className="rounded-xl bg-[#fff8f5] p-10 text-center">
                <BookOpenIcon className="mx-auto mb-4 h-10 w-10 text-[#d7c1c7]" />
                <p className="font-body-md text-[#524348]">
                  {filter === 'all'
                    ? 'No stories yet. Create one with AI, expand a quick idea, or add from a book.'
                    : `No ${filter} stories.`}
                </p>
                {filter === 'all' && (
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/parent/create-story"
                      className="rounded-xl bg-[#FF7956] px-4 py-2 font-label-sm uppercase tracking-widest text-white hover:bg-[#ee6744]"
                    >
                      AI story
                    </Link>
                    <Link
                      href="/parent/add-story"
                      className="rounded-xl border border-[#2d5a3d] px-4 py-2 font-label-sm uppercase tracking-widest text-[#2d5a3d] hover:bg-[#eef6f0]"
                    >
                      Add from source
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredStories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
