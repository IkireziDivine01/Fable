'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StoryShell, { StoryEyebrow, StoryLead, StoryPanel, StoryTitle } from '@/components/story/StoryShell';
import { BookOpenIcon, HandRaisedIcon } from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  generation_type?: string | null;
  is_immersive?: boolean | null;
  created_at: string;
}

export default function KidLibraryPage() {
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
    <StoryShell title="Your library" subtitle="Stories from your family">
      <StoryPanel className="mb-10 overflow-hidden !p-0">
        <div className="grid md:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-10">
            <StoryEyebrow>Reading room · Akarima k&apos;inkuru</StoryEyebrow>
            <StoryTitle>Pick a story and enter its world.</StoryTitle>
            <StoryLead className="!mb-0">
              Read quietly, step into immersive scenes, or hear family voices sentence by sentence.
            </StoryLead>
          </div>
          <div className="relative hidden min-h-[180px] bg-[#520e33] md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,219,210,0.25),_transparent_50%)]" />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 12px,
                  rgba(196, 165, 116, 0.15) 12px,
                  rgba(196, 165, 116, 0.15) 13px
                )`,
              }}
            />
          </div>
        </div>
      </StoryPanel>

      {loading ? (
        <p className="font-body-md text-[#524348]">Opening the shelf…</p>
      ) : stories.length === 0 ? (
        <StoryPanel className="text-center">
          <HandRaisedIcon className="mx-auto mb-4 h-12 w-12 text-[#d7c1c7]" />
          <h2 className="font-headline-md text-headline-md text-[#1e1b18]">Nothing here yet</h2>
          <p className="mt-2 font-body-md text-[#524348]">
            When your family publishes stories, they will appear on this shelf.
          </p>
        </StoryPanel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <article
              key={story.id}
              className="group rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#FF7956]/35 hover:shadow-lg hover:shadow-[#520e33]/10"
            >
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-[#fff8f5] ring-1 ring-[#e9d7d0] transition group-hover:bg-[#ffdbd2]/30">
                <BookOpenIcon className="h-10 w-10 text-[#FF7956]" />
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {story.generation_type === 'ai' && (
                  <span className="rounded-full bg-[#ffdbd2] px-3 py-1 font-label-sm uppercase tracking-widest text-[#520e33]">
                    AI
                  </span>
                )}
                {story.is_immersive && (
                  <span className="rounded-full bg-[#520e33] px-3 py-1 font-label-sm uppercase tracking-widest text-[#ffdbd2]">
                    Immersive
                  </span>
                )}
              </div>
              <h3 className="font-headline-md text-headline-md text-[#1e1b18] group-hover:text-[#520e33]">
                {story.title}
              </h3>
              <Link
                href={`/kid/story/${story.id}`}
                className="mt-4 block min-h-11 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] px-4 py-2 text-center font-label-sm uppercase tracking-widest text-[#524348] hover:border-[#520e33]"
              >
                Read
              </Link>
            </article>
          ))}
        </div>
      )}
    </StoryShell>
  );
}
