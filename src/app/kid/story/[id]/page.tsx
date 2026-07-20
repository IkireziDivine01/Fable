'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImmersiveStoryPlayer, {
  type ActivityLogEvent,
} from '@/components/immersive/ImmersiveStoryPlayer';
import type { KidSentence } from '@/components/story/KidStoryReader';
import StoryShell, { StoryAlert } from '@/components/story/StoryShell';
import type {
  EngagementActivity,
  EnvironmentType,
  SceneBrief,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
} from '@/lib/immersive/types';

async function postStoryActivity(
  storyId: string,
  eventType: string,
  metadata: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/stories/${storyId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
      keepalive: true,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: String(body.error ?? res.status) };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export default function KidStoryReaderPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [sentences, setSentences] = useState<KidSentence[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentType>('village');
  const [sceneSpec, setSceneSpec] = useState<StorySceneSpec | null>(null);
  const [sceneBrief, setSceneBrief] = useState<SceneBrief | null>(null);
  const [sceneEvents, setSceneEvents] = useState<Record<string, SceneEvent> | null>(null);
  const [hotspots, setHotspots] = useState<StoryHotspot[] | null>(null);
  const [engagementActivities, setEngagementActivities] = useState<
    EngagementActivity[] | null
  >(null);
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
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(
            response.status === 404
              ? 'Story API unavailable — restart the dev server and try again'
              : `Story unavailable (${response.status})`
          );
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Story unavailable');

        setTitle(result.story.title);
        setSentences(result.sentences ?? []);
        setEnvironment(result.immersive?.environment ?? 'village');
        setSceneSpec(result.immersive?.animationData?.sceneSpec ?? null);
        setSceneBrief(result.immersive?.animationData?.sceneBrief ?? null);
        setSceneEvents(result.immersive?.animationData?.sceneEvents ?? null);
        setHotspots(result.immersive?.animationData?.hotspots ?? null);
        setEngagementActivities(
          result.immersive?.animationData?.engagementActivities ?? null
        );
        setCharacters(
          result.immersive?.characters?.length
            ? result.immersive.characters
            : [{ name: 'Grandmother', type: 'grandma', position: 1 }]
        );
        setUseAiVoice(Boolean(result.immersive?.animationData?.useAiVoice));

        // Mark unread → reading; never block opening the story if logging fails
        void postStoryActivity(storyId, 'STORY_STARTED', { mode: 'immersive' }).then(
          (result) => {
            if (!result.ok) {
              console.warn('Could not mark story as started:', result.error);
            }
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    }
    if (storyId) load();
  }, [storyId]);

  const handleComplete = async (): Promise<boolean> => {
    // Retry once — this is what flips the shelf + parent dashboard to "finished"
    let result = await postStoryActivity(storyId, 'STORY_COMPLETED', {
      mode: 'immersive',
      sentenceCount: sentences.length,
    });
    if (!result.ok) {
      result = await postStoryActivity(storyId, 'STORY_COMPLETED', {
        mode: 'immersive',
        sentenceCount: sentences.length,
        retry: true,
      });
    }
    if (!result.ok) {
      console.warn('Could not log story completion:', result.error);
      return false;
    }
    return true;
  };

  const handleActivityLog = (
    eventType: ActivityLogEvent,
    metadata: Record<string, unknown>
  ) => {
    void postStoryActivity(storyId, eventType, metadata);
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
      sceneSpec={sceneSpec}
      sceneBrief={sceneBrief}
      sceneEvents={sceneEvents}
      hotspots={hotspots}
      engagementActivities={engagementActivities}
      characters={characters}
      useAiVoice={useAiVoice}
      onComplete={handleComplete}
      onActivityLog={handleActivityLog}
    />
  );
}
