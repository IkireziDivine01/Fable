'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  UsersIcon,
} from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  created_at: string;
  is_immersive?: boolean;
}

interface LearnerShelfCounts {
  unread: number;
  fresh: number;
  reading: number;
  completed: number;
  published: number;
}

interface LearnerSummary {
  id: string;
  name: string;
  storiesReadThisWeek: number;
  storiesStartedThisWeek: number;
  storiesCompletedTotal?: number;
  storiesInProgress?: number;
  starsThisWeek?: number;
  starsTotal?: number;
  shelf?: LearnerShelfCounts;
  lastActiveAt: string | null;
  accountStatus?: string;
}

interface ReadingActivityItem {
  id: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED' | 'QUESTION_ASKED' | 'ACTIVITY_COMPLETED';
  timestamp: string;
  stars?: number;
  activityType?: string;
}

interface ActivityData {
  learners: LearnerSummary[];
  recentActivity: ReadingActivityItem[];
  totalReadsThisWeek: number;
  totalStartsThisWeek: number;
  activeLearnersThisWeek: number;
  totalStarsThisWeek?: number;
  totalStarsAllTime?: number;
  shelfTotals?: LearnerShelfCounts;
  freshPublishedCount?: number;
  dailyCompletions: { date: string; label: string; count: number }[];
  topStories: { storyId: string; title: string; completions: number }[];
  unansweredQuestions?: number;
}

interface KidQuestion {
  id: string;
  kidName: string;
  storyTitle: string | null;
  questionText: string;
  sentenceOrder: number | null;
  createdAt: string;
}

const SHELF_COLORS = {
  finished: '#2d5a3d',
  reading: '#FF7956',
  notStarted: 'rgba(82, 14, 51, 0.35)',
} as const;

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

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-body-sm text-xs text-[#524348]">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function WeekChart({
  days,
  loading,
}: {
  days: ActivityData['dailyCompletions'];
  loading: boolean;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const today = todayDateKey();
  const totalFinishes = days.reduce((sum, d) => sum + d.count, 0);
  const daysWithFinishes = days.filter((d) => d.count > 0).length;

  return (
    <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase tracking-widest text-[#857278]">This week</p>
          <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
            Stories finished
          </h2>
        </div>
        <ColorSwatch color="#FF7956" label="Stories finished that day" />
      </div>

      {loading ? (
        <p className="text-[#524348]">Loading chart…</p>
      ) : (
        <>
          <div className="flex h-44 items-end gap-2 sm:gap-3">
            {days.map((day) => {
              const isToday = day.date === today;
              const height =
                day.count === 0 ? 8 : Math.max(18, Math.round((day.count / max) * 128));
              return (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span
                    className={`font-label-sm text-[10px] tabular-nums ${
                      day.count > 0 ? 'text-[#1e1b18]' : 'text-[#c4b0b6]'
                    }`}
                  >
                    {day.count}
                  </span>
                  <div
                    className={`w-full max-w-10 rounded-t-lg ${
                      day.count > 0
                        ? isToday
                          ? 'bg-[#FF7956] ring-2 ring-[#FF7956]/30 ring-offset-1'
                          : 'bg-[#FF7956]'
                        : 'bg-[#f0e4df]'
                    }`}
                    style={{ height }}
                    title={`${day.label}: ${day.count} finished`}
                  />
                  <span
                    className={`font-label-sm text-[10px] uppercase tracking-wider ${
                      isToday ? 'font-semibold text-[#520e33]' : 'text-[#857278]'
                    }`}
                  >
                    {isToday ? 'Today' : day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 font-body-sm text-sm text-[#857278]">
            {totalFinishes === 0
              ? 'No finishes yet this week — opens will show once learners complete a story.'
              : `${totalFinishes} finish${totalFinishes === 1 ? '' : 'es'} across ${daysWithFinishes} day${daysWithFinishes === 1 ? '' : 's'}`}
          </p>
        </>
      )}
    </section>
  );
}

function ShelfLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      <ColorSwatch color={SHELF_COLORS.finished} label="Finished" />
      <ColorSwatch color={SHELF_COLORS.reading} label="Reading" />
      <ColorSwatch color={SHELF_COLORS.notStarted} label="Not started" />
    </div>
  );
}

function ShelfCount({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  const quiet = count === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-body-sm text-sm ${
        quiet ? 'text-[#c4b0b6]' : 'text-[#524348]'
      }`}
    >
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color, opacity: quiet ? 0.45 : 1 }}
        aria-hidden
      />
      <span className={quiet ? undefined : 'font-semibold text-[#1e1b18]'}>{count}</span>
      {label}
    </span>
  );
}

function LearnerCards({
  learners,
  loading,
}: {
  learners: LearnerSummary[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-[#524348]">Loading learners…</p>;
  }

  if (learners.length === 0) {
    return (
      <div className="rounded-xl bg-[#fff8f5] p-6 text-center">
        <UsersIcon className="mx-auto mb-3 h-8 w-8 text-[#d7c1c7]" />
        <p className="font-body-md text-[#524348]">No learners in your household yet.</p>
        <Link
          href="/parent/family"
          className="mt-3 inline-block font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
        >
          Invite a learner →
        </Link>
      </div>
    );
  }

  const multi = learners.length > 1;

  return (
    <div className={`grid gap-4 ${multi ? 'sm:grid-cols-2' : ''}`}>
      {learners.map((learner) => {
        const pending = learner.accountStatus === 'pending';
        const shelf = learner.shelf;
        const published = shelf?.published ?? 0;
        const readPct =
          !pending && published > 0
            ? Math.round(((shelf?.completed ?? 0) / published) * 100)
            : 0;
        const starsTotal = learner.starsTotal ?? 0;
        const starsThisWeek = learner.starsThisWeek ?? 0;

        return (
          <div
            key={learner.id}
            className="rounded-2xl border border-[#e9d7d0] bg-[#fff8f5] p-5"
          >
            {/* Who */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-headline-md text-[#520e33]">{learner.name}</p>
                {pending ? (
                  <p className="mt-1 font-body-sm text-sm text-[#a7391c]">Awaiting approval</p>
                ) : learner.lastActiveAt ? (
                  <p className="mt-1 font-body-sm text-sm text-[#857278]">
                    Last active {formatRelativeTime(learner.lastActiveAt)}
                  </p>
                ) : (
                  <p className="mt-1 font-body-sm text-sm text-[#857278]">No reading yet</p>
                )}
              </div>
              {!pending && published > 0 && (
                <div className="shrink-0 text-right">
                  <p className="font-headline-md text-2xl leading-none text-[#1e1b18]">
                    {readPct}%
                  </p>
                  <p className="mt-1 font-body-sm text-xs text-[#857278]">of shelf finished</p>
                </div>
              )}
            </div>

            {!pending && shelf && (
              <>
                {/* Shelf story */}
                <div
                  className="mb-3 flex h-3 overflow-hidden rounded-full bg-[#e9d7d0]"
                  role="img"
                  aria-label={`${shelf.completed} finished, ${shelf.reading} reading, ${shelf.unread} not started`}
                >
                  {published > 0 ? (
                    <>
                      {shelf.completed > 0 && (
                        <div
                          className="transition-all"
                          style={{
                            width: `${(shelf.completed / published) * 100}%`,
                            backgroundColor: SHELF_COLORS.finished,
                          }}
                        />
                      )}
                      {shelf.reading > 0 && (
                        <div
                          className="transition-all"
                          style={{
                            width: `${(shelf.reading / published) * 100}%`,
                            backgroundColor: SHELF_COLORS.reading,
                          }}
                        />
                      )}
                      {shelf.unread > 0 && (
                        <div
                          className="transition-all"
                          style={{
                            width: `${(shelf.unread / published) * 100}%`,
                            backgroundColor: SHELF_COLORS.notStarted,
                          }}
                        />
                      )}
                    </>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  <ShelfCount
                    color={SHELF_COLORS.finished}
                    count={shelf.completed}
                    label="finished"
                  />
                  <ShelfCount
                    color={SHELF_COLORS.reading}
                    count={shelf.reading}
                    label="reading"
                  />
                  <ShelfCount
                    color={SHELF_COLORS.notStarted}
                    count={shelf.unread}
                    label="not started"
                  />
                </div>

                {/* This week — secondary, not competing with shelf */}
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#e9d7d0]/80 pt-3 font-body-sm text-sm text-[#857278]">
                  <span>
                    <span className="font-semibold text-[#1e1b18]">
                      {learner.storiesReadThisWeek}
                    </span>{' '}
                    finished this week
                  </span>
                  <span className="text-[#d7c1c7]" aria-hidden>
                    ·
                  </span>
                  <span style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}>
                    <span className="font-semibold text-[#FF7956]">
                      {starsTotal}★
                    </span>
                    {starsThisWeek > 0 ? (
                      <span className="text-[#857278]"> (+{starsThisWeek} this week)</span>
                    ) : (
                      <span className="text-[#857278]"> Letter Party</span>
                    )}
                  </span>
                </div>
              </>
            )}

            {pending && (
              <Link
                href="/parent/family"
                className="mt-1 inline-block font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
              >
                Review in Family →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionsList({
  questions,
  onAnswered,
}: {
  questions: KidQuestion[];
  onAnswered: (id: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submitAnswer = async (questionId: string, event: FormEvent) => {
    event.preventDefault();
    const answerText = (drafts[questionId] ?? '').trim();
    if (!answerText) return;
    setSavingId(questionId);
    setError('');
    try {
      const res = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answerText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save answer');
      onAnswered(questionId);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.id} className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
            <p className="font-body-md text-[#1e1b18]">
              <span className="font-semibold text-[#520e33]">{q.kidName}</span>
              {q.storyTitle ? (
                <>
                  {' '}
                  asked about <span className="font-semibold">{q.storyTitle}</span>
                </>
              ) : (
                ' asked'
              )}
              {q.sentenceOrder != null ? ` (line ${q.sentenceOrder + 1})` : ''}
            </p>
            <p className="mt-2 font-body-md text-[#524348]">“{q.questionText}”</p>
            <p className="mt-1 font-body-sm text-sm text-[#857278]">
              {formatRelativeTime(q.createdAt)}
            </p>
            <form onSubmit={(e) => void submitAnswer(q.id, e)} className="mt-3 space-y-2">
              <textarea
                value={drafts[q.id] ?? ''}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={2}
                placeholder="Write a warm answer…"
                className="w-full resize-none rounded-xl border border-[#e9d7d0] bg-white px-3 py-2 font-body-md text-sm outline-none focus:border-[#FF7956]"
              />
              <button
                type="submit"
                disabled={savingId === q.id || !(drafts[q.id] ?? '').trim()}
                className="min-h-10 rounded-xl bg-[#520e33] px-4 font-label-sm uppercase tracking-widest text-white disabled:opacity-50"
              >
                {savingId === q.id ? 'Saving…' : 'Send answer'}
              </button>
            </form>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 font-body-sm text-sm text-[#a7391c]">{error}</p>}
    </div>
  );
}

function NeedsYouSection({
  questions,
  drafts,
  loadingQuestions,
  loadingStories,
  onAnswered,
}: {
  questions: KidQuestion[];
  drafts: Story[];
  loadingQuestions: boolean;
  loadingStories: boolean;
  onAnswered: (id: string) => void;
}) {
  const stillLoading = loadingQuestions || loadingStories;
  const hasQuestions = questions.length > 0;
  const hasDrafts = drafts.length > 0;

  if (stillLoading) {
    return (
      <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
        <p className="font-label-sm uppercase tracking-widest text-[#857278]">Needs you</p>
        <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
          Things waiting on you
        </h2>
        <p className="mt-4 text-[#524348]">Checking…</p>
      </section>
    );
  }

  if (!hasQuestions && !hasDrafts) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
      <div className="mb-5">
        <p className="font-label-sm uppercase tracking-widest text-[#857278]">Needs you</p>
        <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
          Things waiting on you
        </h2>
      </div>

      <div className="space-y-6">
        {hasQuestions && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0 text-[#FF7956]" />
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                Mid-story questions
              </p>
            </div>
            <QuestionsList questions={questions} onAnswered={onAnswered} />
          </div>
        )}

        {hasDrafts && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4 shrink-0 text-[#520e33]" />
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                Drafts needing setup
              </p>
            </div>
            <ul className="space-y-2">
              {drafts.map((story) => (
                <li key={story.id}>
                  <Link
                    href={`/parent/story/${story.id}/immersive`}
                    className="block rounded-xl border border-[#e9d7d0] px-4 py-3 transition hover:border-[#FF7956]/40"
                  >
                    <p className="truncate font-body-md text-[#1e1b18]">{story.title}</p>
                    <p className="mt-0.5 font-label-sm uppercase tracking-widest text-[#520e33]">
                      Continue setup →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [questions, setQuestions] = useState<KidQuestion[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [storiesRes, activityRes, questionsRes] = await Promise.all([
          fetch('/api/stories'),
          fetch('/api/parent/activity'),
          fetch('/api/questions?unanswered=1'),
        ]);
        if (storiesRes.ok) setStories(await storiesRes.json());
        if (activityRes.ok) setActivity(await activityRes.json());
        if (questionsRes.ok) {
          const data = await questionsRes.json();
          setQuestions(data.questions ?? []);
        }
      } finally {
        setLoadingStories(false);
        setLoadingActivity(false);
        setLoadingQuestions(false);
      }
    }
    load();
  }, []);

  const publishedCount = stories.filter((s) => s.status === 'published').length;
  const draftsNeedingSetup = stories.filter((s) => s.status === 'draft').slice(0, 3);
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Parent';

  const recentEvents = useMemo(() => activity?.recentActivity ?? [], [activity]);
  const daily = activity?.dailyCompletions ?? [];
  const hasWeekActivity =
    (activity?.totalReadsThisWeek ?? 0) > 0 || (activity?.totalStartsThisWeek ?? 0) > 0;

  const snapshotStats = [
    {
      label: 'Finished this week',
      value: loadingActivity ? '—' : (activity?.totalReadsThisWeek ?? 0),
    },
    {
      label: 'Stars this week',
      value: loadingActivity ? '—' : `${activity?.totalStarsThisWeek ?? 0}★`,
    },
    {
      label: 'Open questions',
      value: loadingQuestions
        ? '—'
        : (activity?.unansweredQuestions ?? questions.length),
    },
    {
      label: 'In progress',
      value: loadingActivity ? '—' : (activity?.shelfTotals?.reading ?? 0),
    },
  ];

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        {/* 1. Welcome */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-1 font-label-sm uppercase tracking-widest text-[#857278]">Home</p>
            <h1 className="font-headline-lg text-headline-lg text-[#1e1b18]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 font-body-md text-[#524348]">
              See how reading is going, answer questions, and keep stories ready for your learners.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/parent/library"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#520e33] px-5 font-label-md text-[#520e33] hover:border-[#FF7956] hover:text-[#a7391c]"
            >
              <BookOpenIcon className="h-4 w-4" />
              Library
            </Link>
            <Link
              href="/parent/create-story"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
            >
              <SparklesIcon className="h-4 w-4" />
              New story
            </Link>
          </div>
        </header>

        {/* 2. This week snapshot — 4 metrics */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshotStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#e9d7d0] bg-white px-5 py-4 shadow-sm shadow-[#520e33]/5"
            >
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">{stat.label}</p>
              <p className="mt-1.5 font-headline-md text-headline-md text-[#520e33]">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {/* 3. Needs you */}
          <NeedsYouSection
            questions={questions}
            drafts={draftsNeedingSetup}
            loadingQuestions={loadingQuestions}
            loadingStories={loadingStories}
            onAnswered={(id) => setQuestions((prev) => prev.filter((q) => q.id !== id))}
          />

          {/* 4. Week chart */}
          <WeekChart days={daily} loading={loadingActivity} />

          {/* 5. Each learner's shelf */}
          <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                  Learners
                </p>
                <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
                  Each learner&apos;s shelf
                </h2>
                <div className="mt-2">
                  <ShelfLegend />
                </div>
              </div>
              <Link
                href="/parent/family"
                className="shrink-0 font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
              >
                Family →
              </Link>
            </div>
            <LearnerCards learners={activity?.learners ?? []} loading={loadingActivity} />
          </section>

          {/* 6. Recent moments */}
          <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
            <div className="mb-5">
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                Recent moments
              </p>
              <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
                What just happened
              </h2>
            </div>

            {loadingActivity ? (
              <p className="text-[#524348]">Loading activity…</p>
            ) : recentEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e9d7d0] p-8 text-center">
                <ClockIcon className="mx-auto mb-3 h-8 w-8 text-[#d7c1c7]" />
                <p className="font-body-md text-[#524348]">
                  Starts and finishes will show here once learners open stories.
                </p>
                {!hasWeekActivity && publishedCount > 0 && (
                  <p className="mt-2 font-body-sm text-sm text-[#857278]">
                    You have {publishedCount} published stor
                    {publishedCount === 1 ? 'y' : 'ies'} ready for them.
                  </p>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {recentEvents.slice(0, 6).map((item) => {
                  const done = item.eventType === 'STORY_COMPLETED';
                  const asked = item.eventType === 'QUESTION_ASKED';
                  const starred = item.eventType === 'ACTIVITY_COMPLETED';
                  const verb = done ? 'finished' : asked || starred ? '' : 'started';
                  return (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                    >
                      {done ? (
                        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2d5a3d]" />
                      ) : asked ? (
                        <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#520e33]" />
                      ) : starred ? (
                        <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#FF7956]" />
                      ) : (
                        <BookOpenIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#C4A574]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-body-md text-[#1e1b18]">
                          <span className="font-semibold text-[#520e33]">{item.kidName}</span>
                          {starred ? (
                            <>
                              {' '}
                              earned{' '}
                              <span className="font-semibold text-[#FF7956]">
                                {item.stars && item.stars > 0 ? `${item.stars}★` : 'stars'}
                              </span>{' '}
                              in {item.storyTitle}
                            </>
                          ) : asked ? (
                            <> asked about {item.storyTitle}</>
                          ) : (
                            <>
                              {' '}
                              {verb} <span className="font-semibold">{item.storyTitle}</span>
                            </>
                          )}
                        </p>
                        <p className="mt-1 font-body-sm text-sm text-[#857278]">
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
