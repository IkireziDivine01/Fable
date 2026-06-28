'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { ArrowRightIcon, BookOpenIcon } from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      <AppHeader title="Parent home" subtitle="Household overview" />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 font-label-md uppercase tracking-[0.2em] text-[#33001d]">
              Welcome back
            </p>
            <h1 className="font-headline-xl text-headline-xl">
              {session?.user?.name ?? 'Parent'}, your library awaits.
            </h1>
            <p className="mt-2 max-w-xl font-body-md text-[#524348]">
              Manage family members, approve learners, and keep every story in one protected place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/parent/create-story"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
            >
              AI STORY
            </Link>
            <Link
              href="/parent/quick-story"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#520e33] px-5 font-label-md text-[#520e33] hover:border-[#FF7956] hover:text-[#a7391c]"
            >
              QUICK 2-SENTENCE
            </Link>
            <Link
              href="/parent/family"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#520e33] px-5 font-label-md tracking-widest text-white hover:bg-[#3c0826]"
            >
              FAMILY
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Stories in library', value: stories.length },
            { label: 'Your role', value: 'Parent' },
            { label: 'Household', value: session?.user?.householdId ? 'Connected' : '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5"
            >
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">{stat.label}</p>
              <p className="mt-2 font-headline-md text-headline-md text-[#520e33]">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-[#e9d7d0] bg-white p-8">
          <h2 className="mb-6 font-headline-md text-headline-md">Family stories</h2>
          {loading ? (
            <p className="text-[#524348]">Loading stories…</p>
          ) : stories.length === 0 ? (
            <div className="rounded-xl bg-[#fff8f5] p-10 text-center">
              <BookOpenIcon className="mx-auto mb-4 h-10 w-10 text-[#d7c1c7]" />
              <p className="font-body-md text-[#524348]">
                No stories yet. Invite an author to begin recording.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-xl border border-[#e9d7d0] p-5 transition hover:border-[#FF7956]/40"
                >
                  <p className="font-headline-md text-[#1e1b18]">{story.title}</p>
                  <p className="mt-1 font-body-sm text-sm text-[#857278]">
                    {story.status} · {new Date(story.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
