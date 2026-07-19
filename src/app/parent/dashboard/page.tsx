'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LightBulbIcon,
  PlusIcon,
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

interface LearnerSummary {
  id: string;
  name: string;
  storiesReadThisWeek: number;
  storiesStartedThisWeek: number;
  storiesCompletedTotal?: number;
  storiesInProgress?: number;
  lastActiveAt: string | null;
  accountStatus?: string;
}

interface ReadingActivityItem {
  id: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED' | 'QUESTION_ASKED' | 'WARUZIKO_VIEWED';
  timestamp: string;
}

interface ActivityData {
  learners: LearnerSummary[];
  recentActivity: ReadingActivityItem[];
  totalReadsThisWeek: number;
  totalStartsThisWeek: number;
  activeLearnersThisWeek: number;
  dailyCompletions: { date: string; label: string; count: number }[];
  topStories: { storyId: string; title: string; completions: number }[];
  unansweredQuestions?: number;
  waruzikoViewsThisWeek?: number;
}

interface KidQuestion {
  id: string;
  kidName: string;
  storyTitle: string | null;
  questionText: string;
  sentenceOrder: number | null;
  createdAt: string;
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

function WeekChart({
  days,
  loading,
}: {
  days: ActivityData['dailyCompletions'];
  loading: boolean;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
      <div className="mb-5">
        <p className="font-label-sm uppercase tracking-widest text-[#857278]">This week</p>
        <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">Stories finished</h2>
      </div>

      {loading ? (
        <p className="text-[#524348]">Loading chart…</p>
      ) : (
        <div className="flex h-40 items-end gap-2 sm:gap-3">
          {days.map((day) => {
            const height = day.count === 0 ? 8 : Math.max(16, Math.round((day.count / max) * 120));
            return (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="font-label-sm text-[10px] text-[#857278]">
                  {day.count > 0 ? day.count : ''}
                </span>
                <div
                  className={`w-full max-w-10 rounded-t-lg ${
                    day.count > 0 ? 'bg-[#FF7956]' : 'bg-[#f0e4df]'
                  }`}
                  style={{ height }}
                  title={`${day.label}: ${day.count}`}
                />
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#857278]">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
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

  const maxReads = Math.max(1, ...learners.map((l) => l.storiesReadThisWeek));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {learners.map((learner) => {
        const pending = learner.accountStatus === 'pending';
        const barWidth = pending
          ? 0
          : Math.round((learner.storiesReadThisWeek / maxReads) * 100);
        return (
          <div
            key={learner.id}
            className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
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
              {!pending && (
                <p className="shrink-0 font-headline-md text-[#1e1b18]">
                  {learner.storiesReadThisWeek}
                  <span className="ml-1 font-label-sm text-[10px] uppercase tracking-widest text-[#857278]">
                    done
                  </span>
                </p>
              )}
            </div>

            {!pending && (
              <>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e9d7d0]">
                  <div
                    className="h-full rounded-full bg-[#520e33] transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="font-body-sm text-sm text-[#524348]">
                  {learner.storiesReadThisWeek} finished this week
                  {(learner.storiesInProgress ?? 0) > 0
                    ? ` · ${learner.storiesInProgress} in progress`
                    : ''}
                  {(learner.storiesCompletedTotal ?? 0) > 0
                    ? ` · ${learner.storiesCompletedTotal} total finished`
                    : ''}
                </p>
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

function QuestionsInbox({
  questions,
  loading,
  onAnswered,
}: {
  questions: KidQuestion[];
  loading: boolean;
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
    <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
      <div className="mb-5 flex items-start gap-3">
        <ChatBubbleLeftRightIcon className="mt-1 h-5 w-5 shrink-0 text-[#FF7956]" />
        <div>
          <p className="font-label-sm uppercase tracking-widest text-[#857278]">
            Mid-story questions
          </p>
          <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
            Waiting for your answer
          </h2>
        </div>
      </div>

      {loading ? (
        <p className="text-[#524348]">Loading questions…</p>
      ) : questions.length === 0 ? (
        <p className="font-body-md text-[#524348]">
          When learners tap Ask mid-story, their questions show up here.
        </p>
      ) : (
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
      )}
      {error && <p className="mt-3 font-body-sm text-sm text-[#a7391c]">{error}</p>}
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
  const draftCount = stories.filter((s) => s.status === 'draft').length;
  const draftsNeedingSetup = stories.filter((s) => s.status === 'draft').slice(0, 3);
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Parent';

  const recentEvents = useMemo(() => activity?.recentActivity ?? [], [activity]);
  const daily = activity?.dailyCompletions ?? [];
  const hasWeekActivity =
    (activity?.totalReadsThisWeek ?? 0) > 0 || (activity?.totalStartsThisWeek ?? 0) > 0;

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-1 font-label-sm uppercase tracking-widest text-[#857278]">Home</p>
            <h1 className="font-headline-lg text-headline-lg text-[#1e1b18]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 font-body-md text-[#524348]">
              See how your learners are reading this week — manage stories in the library.
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

        {/* Analytics summary — finished counts use unique stories (same as kid library) */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: 'Finished this week',
              value: loadingActivity ? '—' : (activity?.totalReadsThisWeek ?? 0),
            },
            {
              label: 'Started this week',
              value: loadingActivity ? '—' : (activity?.totalStartsThisWeek ?? 0),
            },
            {
              label: 'Active learners',
              value: loadingActivity ? '—' : (activity?.activeLearnersThisWeek ?? 0),
            },
            {
              label: 'Open questions',
              value: loadingQuestions
                ? '—'
                : (activity?.unansweredQuestions ?? questions.length),
            },
            {
              label: 'Waruziko views',
              value: loadingActivity ? '—' : (activity?.waruzikoViewsThisWeek ?? 0),
            },
            {
              label: 'Stories in library',
              value: loadingStories ? '—' : stories.length,
              href: '/parent/library',
            },
          ].map((stat) => {
            const inner = (
              <>
                <p className="font-label-sm uppercase tracking-widest text-[#857278]">{stat.label}</p>
                <p className="mt-1.5 font-headline-md text-headline-md text-[#520e33]">{stat.value}</p>
              </>
            );
            return stat.href ? (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-2xl border border-[#e9d7d0] bg-white px-5 py-4 shadow-sm shadow-[#520e33]/5 transition hover:border-[#FF7956]/40"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#e9d7d0] bg-white px-5 py-4 shadow-sm shadow-[#520e33]/5"
              >
                {inner}
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-3">
            <WeekChart days={daily} loading={loadingActivity} />

            <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                    Learners
                  </p>
                  <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
                    Weekly reading
                  </h2>
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

            <QuestionsInbox
              questions={questions}
              loading={loadingQuestions}
              onAnswered={(id) => setQuestions((prev) => prev.filter((q) => q.id !== id))}
            />

            <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
              <div className="mb-5">
                <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                  Recent activity
                </p>
                <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">
                  What&apos;s been happening
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
                      You have {publishedCount} published stor{publishedCount === 1 ? 'y' : 'ies'}
                      ready for them.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentEvents.slice(0, 8).map((item) => {
                    const done = item.eventType === 'STORY_COMPLETED';
                    const asked = item.eventType === 'QUESTION_ASKED';
                    const waruziko = item.eventType === 'WARUZIKO_VIEWED';
                    const verb = done
                      ? 'finished'
                      : asked
                        ? ''
                        : waruziko
                          ? 'read'
                          : 'started';
                    return (
                      <li
                        key={item.id}
                        className="flex gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                      >
                        {done ? (
                          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2d5a3d]" />
                        ) : asked ? (
                          <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#520e33]" />
                        ) : waruziko ? (
                          <LightBulbIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#C4A574]" />
                        ) : (
                          <BookOpenIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#FF7956]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-body-md text-[#1e1b18]">
                            <span className="font-semibold text-[#520e33]">{item.kidName}</span>{' '}
                            {asked ? (
                              <span className="font-semibold">{item.storyTitle}</span>
                            ) : (
                              <>
                                {verb}{' '}
                                <span className="font-semibold">{item.storyTitle}</span>
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

          <div className="space-y-8 lg:col-span-2">
            {/* Library snapshot */}
            <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-label-sm uppercase tracking-widest text-[#857278]">Library</p>
                  <h2 className="mt-1 font-headline-md text-headline-md">At a glance</h2>
                </div>
                <Link
                  href="/parent/library"
                  className="shrink-0 font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
                >
                  Open →
                </Link>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#fff8f5] px-4 py-3">
                  <p className="font-label-sm uppercase tracking-widest text-[#857278]">Published</p>
                  <p className="mt-1 font-headline-md text-[#2d5a3d]">
                    {loadingStories ? '—' : publishedCount}
                  </p>
                </div>
                <div className="rounded-xl bg-[#fff8f5] px-4 py-3">
                  <p className="font-label-sm uppercase tracking-widest text-[#857278]">Drafts</p>
                  <p className="mt-1 font-headline-md text-[#a7391c]">
                    {loadingStories ? '—' : draftCount}
                  </p>
                </div>
              </div>

              {draftsNeedingSetup.length > 0 ? (
                <div>
                  <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
                    Needs setup
                  </p>
                  <ul className="space-y-2">
                    {draftsNeedingSetup.map((story) => (
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
              ) : (
                <p className="font-body-sm text-sm text-[#524348]">
                  {loadingStories
                    ? 'Checking drafts…'
                    : stories.length === 0
                      ? 'Your library is empty. Create the first story.'
                      : 'No drafts waiting — everything published is ready for learners.'}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/parent/create-story"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#FF7956] px-4 font-label-sm uppercase tracking-widest text-white hover:bg-[#ee6744]"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  AI story
                </Link>
                <Link
                  href="/parent/add-story"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#2d5a3d] bg-[#eef6f0] px-4 font-label-sm uppercase tracking-widest text-[#2d5a3d]"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  From source
                </Link>
              </div>
            </section>

            {/* Top stories */}
            <section className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-7">
              <div className="mb-5">
                <p className="font-label-sm uppercase tracking-widest text-[#857278]">Favorites</p>
                <h2 className="mt-1 font-headline-md text-headline-md">Most finished this week</h2>
              </div>

              {loadingActivity ? (
                <p className="text-[#524348]">Loading…</p>
              ) : !activity?.topStories?.length ? (
                <div className="rounded-xl border border-dashed border-[#e9d7d0] p-6 text-center">
                  <p className="font-body-md text-[#524348]">
                    Popular stories will appear once learners finish a few.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {activity.topStories.map((story, index) => (
                    <li
                      key={story.storyId}
                      className="flex items-center gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] px-4 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#520e33] font-label-sm text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-md text-[#1e1b18]">{story.title}</p>
                        <p className="font-body-sm text-sm text-[#857278]">
                          {story.completions} finish{story.completions === 1 ? '' : 'es'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
