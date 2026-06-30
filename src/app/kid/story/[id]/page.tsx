'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImmersiveStoryPlayer from '@/components/immersive/ImmersiveStoryPlayer';
import type { KidSentence } from '@/components/story/KidStoryReader';
import StoryShell, { StoryAlert } from '@/components/story/StoryShell';
import type { EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';

export default function KidStoryReaderPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [sentences, setSentences] = useState<KidSentence[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentType>('village');
  const [characters, setCharacters] = useState<StoryCharacterSlot[]>([
    { name: 'Grandmother', type: 'grandma', position: 1 },
  ]);
  const [useAiVoice, setUseAiVoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}/immersive`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Story unavailable');

        setTitle(result.story.title);
        setSentences(result.sentences ?? []);
        setEnvironment(result.immersive?.environment ?? 'village');
        setCharacters(
          result.immersive?.characters?.length
            ? result.immersive.characters
            : [{ name: 'Grandmother', type: 'grandma', position: 1 }]
        );
        setUseAiVoice(Boolean(result.immersive?.animationData?.useAiVoice));

        await fetch(`/api/stories/${storyId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'STORY_STARTED', metadata: { mode: 'immersive' } }),
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
        metadata: { mode: 'immersive', sentenceCount: sentences.length },
      }),
    });
  };

  if (loading) {
    return (
      <StoryShell title="Story" subtitle="Entering the world…" maxWidth="2xl">
        <p className="text-center font-body-md text-[#524348]">Preparing the scene…</p>
      </StoryShell>
    );
  }

  if (error) {
    return (
      <StoryShell title="Story" maxWidth="2xl" backHref="/kid/library" backLabel="Library">
        <StoryAlert message={error} />
      </StoryShell>
    );
  }

  return (
    <ImmersiveStoryPlayer
      storyId={storyId}
      title={title}
      sentences={sentences}
      environment={environment}
      characters={characters}
      useAiVoice={useAiVoice}
      onComplete={handleComplete}
    />
  );
}
