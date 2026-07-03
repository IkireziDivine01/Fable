'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpenIcon } from '@/components/HeroIcons';

interface LibraryStory {
  id: string;
  title: string;
  status?: string;
  themes?: string[] | null;
  is_immersive?: boolean | null;
  generation_type?: string | null;
  created_at?: string;
}

function pickRecommendations(stories: LibraryStory[], currentStoryId: string, limit = 3) {
  const current = stories.find((story) => story.id === currentStoryId);
  const others = stories.filter((story) => story.id !== currentStoryId);
  if (others.length === 0) return [];

  const currentThemes = new Set((current?.themes ?? []).map((theme) => theme.toLowerCase()));

  return [...others]
    .sort((a, b) => {
      const scoreA = (a.themes ?? []).filter((theme) => currentThemes.has(theme.toLowerCase())).length;
      const scoreB = (b.themes ?? []).filter((theme) => currentThemes.has(theme.toLowerCase())).length;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

interface StoryRecommendationsProps {
  currentStoryId: string;
  variant?: 'dark' | 'light';
}

export default function StoryRecommendations({
  currentStoryId,
  variant = 'dark',
}: StoryRecommendationsProps) {
  const [stories, setStories] = useState<LibraryStory[]>([]);
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
    void load();
  }, []);

  const recommendations = useMemo(
    () => pickRecommendations(stories, currentStoryId),
    [stories, currentStoryId]
  );

  if (loading || recommendations.length === 0) return null;

  const isDark = variant === 'dark';

  return (
    <section className="mt-12 w-full max-w-3xl text-left">
      <p
        className={`mb-4 text-center font-label-sm uppercase tracking-[0.25em] ${
          isDark ? 'text-[#C4A574]' : 'text-[#857278]'
        }`}
      >
        What to read next
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((story) => (
          <Link
            key={story.id}
            href={`/kid/story/${story.id}`}
            className={`group flex flex-col rounded-xl border p-4 transition hover:-translate-y-0.5 ${
              isDark
                ? 'border-[#fff8f5]/10 bg-[#fff8f5]/5 hover:border-[#FF7956]/40 hover:bg-[#fff8f5]/10'
                : 'border-[#e9d7d0] bg-white hover:border-[#FF7956]/35 hover:shadow-md'
            }`}
          >
            <div
              className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${
                isDark ? 'bg-[#FF7956]/15 text-[#FF7956]' : 'bg-[#fff8f5] text-[#FF7956]'
              }`}
            >
              <BookOpenIcon className="h-6 w-6" />
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {story.is_immersive && (
                <span
                  className={`rounded-full px-2 py-0.5 font-label-sm uppercase tracking-widest ${
                    isDark ? 'bg-[#520e33] text-[#ffdbd2]' : 'bg-[#520e33] text-[#ffdbd2]'
                  }`}
                >
                  Immersive
                </span>
              )}
              {(story.themes ?? []).slice(0, 1).map((theme) => (
                <span
                  key={theme}
                  className={`rounded-full px-2 py-0.5 font-label-sm uppercase tracking-widest ${
                    isDark ? 'bg-[#fff8f5]/10 text-[#ffdbd2]/80' : 'bg-[#ffdbd2] text-[#520e33]'
                  }`}
                >
                  {theme}
                </span>
              ))}
            </div>
            <h3
              className={`font-headline-md text-base leading-snug ${
                isDark ? 'text-[#fff8f5] group-hover:text-[#ffdbd2]' : 'text-[#1e1b18] group-hover:text-[#520e33]'
              }`}
            >
              {story.title}
            </h3>
            <span
              className={`mt-3 font-label-sm uppercase tracking-widest ${
                isDark ? 'text-[#FF7956]' : 'text-[#524348]'
              }`}
            >
              Read now →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
