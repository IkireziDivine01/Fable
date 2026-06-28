'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StoryShell, {
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
} from '@/components/story/StoryShell';
import { BookOpenIcon } from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  generation_type?: string | null;
  created_at: string;
}

export default function ElderDashboardPage() {
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

  const drafts = stories.filter((s) => s.status === 'draft');
  const published = stories.filter((s) => s.status === 'published');

  return (
    <StoryShell title="Author studio" subtitle="Draft · refine · publish">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <StoryEyebrow>Your desk</StoryEyebrow>
          <StoryTitle>Stories you are shaping</StoryTitle>
          <StoryLead className="!mb-0">
            Write by hand, enrich each sentence, record voices, and publish to the learner library.
          </StoryLead>
        </div>
        <Link href="/elder/create-story">
          <StoryButton>New manual story</StoryButton>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <StoryPanel>
          <h2 className="mb-4 font-headline-md text-headline-md text-[#1e1b18]">
            Drafts ({drafts.length})
          </h2>
          {loading ? (
            <p className="text-[#524348]">Loading…</p>
          ) : drafts.length === 0 ? (
            <p className="text-[#857278]">No drafts yet — start a new story.</p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((story) => (
                <li
                  key={story.id}
                  className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                >
                  <p className="font-headline-md text-[#1e1b18]">{story.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/elder/story/${story.id}/edit-sentences`}>
                      <StoryButton variant="secondary">Edit sentences</StoryButton>
                    </Link>
                    <Link href={`/elder/story/${story.id}/preview`}>
                      <StoryButton variant="ghost">Preview</StoryButton>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StoryPanel>

        <StoryPanel>
          <h2 className="mb-4 font-headline-md text-headline-md text-[#1e1b18]">
            Published ({published.length})
          </h2>
          {published.length === 0 ? (
            <p className="text-[#857278]">Published stories appear in the learner library.</p>
          ) : (
            <ul className="space-y-3">
              {published.map((story) => (
                <li
                  key={story.id}
                  className="flex items-start gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                >
                  <BookOpenIcon className="h-6 w-6 shrink-0 text-[#FF7956]" />
                  <div>
                    <p className="font-headline-md text-[#1e1b18]">{story.title}</p>
                    <p className="text-sm text-[#857278]">Live in learner library</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StoryPanel>
      </div>
    </StoryShell>
  );
}
