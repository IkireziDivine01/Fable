'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImmersiveSetupWizard from '@/components/immersive/ImmersiveSetupWizard';
import StoryShell, { StoryAlert } from '@/components/story/StoryShell';
import type { EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';

export default function ElderImmersiveSetupPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentType>('village');
  const [characters, setCharacters] = useState<StoryCharacterSlot[]>([]);
  const [isImmersive, setIsImmersive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}/immersive`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load');
        setTitle(result.story.title);
        setEnvironment(result.immersive?.environment ?? 'village');
        setCharacters(result.immersive?.characters ?? []);
        setIsImmersive(Boolean(result.immersive?.isImmersive));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    if (storyId) load();
  }, [storyId]);

  if (loading) {
    return (
      <StoryShell title="Immersive setup" subtitle="Loading…" maxWidth="lg">
        <p className="text-[#524348]">Loading story…</p>
      </StoryShell>
    );
  }

  if (error) {
    return (
      <StoryShell title="Immersive setup" backHref="/elder/dashboard" backLabel="Dashboard" maxWidth="lg">
        <StoryAlert message={error} />
      </StoryShell>
    );
  }

  return (
    <StoryShell
      title="Immersive setup"
      subtitle={title}
      backHref="/elder/dashboard"
      backLabel="Dashboard"
      maxWidth="lg"
    >
      <ImmersiveSetupWizard
        storyId={storyId}
        storyTitle={title}
        initialEnvironment={environment}
        initialCharacters={characters}
        initialIsImmersive={isImmersive}
        backHref="/elder/dashboard"
      />
    </StoryShell>
  );
}
