'use client';

import { useRouter } from 'next/navigation';
import AIStoryGenerator, { type SaveDraftResult } from '@/components/AIStoryGenerator';
import StoryShell from '@/components/story/StoryShell';
import type { GeneratedStoryPayload } from '@/lib/storyHelpers';

export default function ParentCreateStoryPage() {
  const router = useRouter();

  const saveDraft = async (story: GeneratedStoryPayload): Promise<SaveDraftResult | null> => {
    const response = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: story.title,
        transcript: story.transcript,
        themes: story.themes,
        sentences: story.sentences,
        generationType: 'ai',
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Save failed');

    return {
      storyId: result.story.id as string,
      sentences: (result.sentences ?? []).map(
        (row: { id: string; sentence_order: number; sentence_text: string; audio_url?: string }) => ({
          id: row.id,
          sentenceOrder: row.sentence_order,
          sentenceText: row.sentence_text,
          audioUrl: row.audio_url,
        })
      ),
    };
  };

  return (
    <StoryShell
      title="Create story"
      subtitle="AI generation"
      backHref="/parent/dashboard"
      backLabel="Dashboard"
      maxWidth="2xl"
    >
      <AIStoryGenerator
        apiPath="/api/claude/generate-story"
        payload={{ prompt: '' }}
        promptLabel="AI story"
        onSaveDraft={saveDraft}
        onPublished={() => router.push('/parent/dashboard?published=1')}
      />
    </StoryShell>
  );
}
