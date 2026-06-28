'use client';

import { useState } from 'react';
import SentenceAudioRecorder from '@/components/story/SentenceAudioRecorder';
import StoryPreview from '@/components/story/StoryPreview';
import {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
  storyInputClass,
  storyTextareaClass,
} from '@/components/story/StoryShell';
import type { GeneratedStoryPayload } from '@/lib/storyHelpers';

interface SavedSentence {
  id: string;
  sentenceOrder: number;
  sentenceText: string;
  audioUrl?: string | null;
}

export interface SaveDraftResult {
  storyId: string;
  sentences: SavedSentence[];
}

interface AIStoryGeneratorProps {
  apiPath: '/api/claude/generate-story' | '/api/claude/expand-story';
  payload: Record<string, string>;
  promptLabel: string;
  onSaveDraft: (story: GeneratedStoryPayload) => Promise<SaveDraftResult | null>;
  onPublished: (storyId: string) => void;
}

export default function AIStoryGenerator({
  apiPath,
  payload,
  promptLabel,
  onSaveDraft,
  onPublished,
}: AIStoryGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState<GeneratedStoryPayload | null>(null);
  const [saved, setSaved] = useState<SaveDraftResult | null>(null);
  const [formValues, setFormValues] = useState(payload);

  const generate = async () => {
    setLoading(true);
    setError('');
    setStory(null);
    setSaved(null);

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Generation failed');
      setStory(result.story);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!story) return null;
    const result = await onSaveDraft(story);
    if (result) setSaved(result);
    return result;
  };

  const saveAndPublish = async () => {
    if (!story) return;
    setPublishing(true);
    setError('');

    try {
      let draft = saved;
      if (!draft) {
        draft = await saveDraft();
        if (!draft) throw new Error('Failed to save draft');
      }

      const response = await fetch(`/api/stories/${draft.storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Publish failed');
      onPublished(draft.storyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (!story) {
    return (
      <StoryPanel>
        <StoryEyebrow>{promptLabel}</StoryEyebrow>
        <StoryTitle>Shape your family story</StoryTitle>
        <StoryLead>
          Describe a moment, a value, or a memory. Claude will draft a story you can voice and share.
        </StoryLead>

        {Object.entries(formValues).map(([key, value]) => (
          <label key={key} className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              {key === 'prompt'
                ? 'Story prompt'
                : key === 'sentenceOne'
                  ? 'First sentence'
                  : 'Second sentence'}
            </span>
            {key === 'prompt' ? (
              <textarea
                value={value}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={4}
                className={storyTextareaClass}
                placeholder="A rainy evening when Grandmother taught us about Ubuntu…"
              />
            ) : (
              <input
                value={value}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                className={storyInputClass}
              />
            )}
          </label>
        ))}

        {error && <StoryAlert message={error} />}
        <StoryButton onClick={generate} disabled={loading} className="w-full sm:w-full">
          {loading ? 'Writing with Claude…' : 'Generate story'}
        </StoryButton>
      </StoryPanel>
    );
  }

  return (
    <div className="space-y-6">
      <StoryPreview
        story={story}
        onRegenerate={generate}
        onPublish={saveAndPublish}
        publishing={publishing}
      />

      <StoryPanel>
        <StoryEyebrow>Step 2 · Voice</StoryEyebrow>
        <h2 className="mb-3 font-headline-md text-headline-md text-[#1e1b18]">Record each sentence</h2>
        <StoryLead>
          Kids hear your voice line by line as they read. Save the draft first, then record — optional
          but magical.
        </StoryLead>

        {!saved ? (
          <StoryButton onClick={saveDraft} disabled={publishing} variant="secondary" className="w-full">
            Save draft to unlock recording
          </StoryButton>
        ) : (
          <div className="space-y-4">
            {saved.sentences.map((sentence, index) => (
              <div key={sentence.id} className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
                <p className="mb-3 font-body-md text-[#1e1b18]">
                  <span className="mr-2 font-label-sm uppercase tracking-widest text-[#857278]">
                    {index + 1}.
                  </span>
                  {sentence.sentenceText}
                </p>
                <SentenceAudioRecorder
                  storyId={saved.storyId}
                  sentenceId={sentence.id}
                  existingUrl={sentence.audioUrl}
                  compact
                  onUploaded={(url) =>
                    setSaved((prev) =>
                      prev
                        ? {
                            ...prev,
                            sentences: prev.sentences.map((s) =>
                              s.id === sentence.id ? { ...s, audioUrl: url } : s
                            ),
                          }
                        : prev
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </StoryPanel>

      {error && <StoryAlert message={error} />}
    </div>
  );
}
