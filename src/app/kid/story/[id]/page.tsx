'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import KidStoryReader, { type KidSentence } from '@/components/story/KidStoryReader';
import StoryShell, { StoryAlert } from '@/components/story/StoryShell';

export default function KidStoryReaderPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [sentences, setSentences] = useState<KidSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Story unavailable');
        setTitle(result.story.title);
        setSentences(result.sentences ?? []);

        await fetch(`/api/stories/${storyId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'STORY_STARTED' }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    }
    if (storyId) load();
  }, [storyId]);

  const handleComplete = async () => {
    await fetch(`/api/stories/${storyId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'STORY_COMPLETED',
        metadata: { sentenceCount: sentences.length },
      }),
    });
  };

  if (loading) {
    return (
      <StoryShell title="Reading" subtitle="Opening story…" maxWidth="2xl">
        <p className="text-center font-body-md text-[#524348]">Gathering the words…</p>
      </StoryShell>
    );
  }

  if (error) {
    return (
      <StoryShell title="Reading" maxWidth="2xl" backHref="/kid/library" backLabel="Library">
        <StoryAlert message={error} />
      </StoryShell>
    );
  }

  return (
    <StoryShell title="Reading" subtitle={title} maxWidth="2xl" backHref="/kid/library" backLabel="Library">
      <KidStoryReader
        storyId={storyId}
        title={title}
        sentences={sentences}
        onComplete={handleComplete}
      />
    </StoryShell>
  );
}
