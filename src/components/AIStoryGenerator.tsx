'use client';

import { useMemo, useState } from 'react';
import EditableStoryPreview from '@/components/story/EditableStoryPreview';
import SentenceAudioRecorder from '@/components/story/SentenceAudioRecorder';
import ImmersiveWorldSetup from '@/components/immersive/ImmersiveWorldSetup';
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
import { ENVIRONMENT_LABELS, CHARACTER_META } from '@/lib/immersive/presets';
import type { EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';
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

type WizardStep = 'world' | 'prompt' | 'review' | 'edit' | 'voice';

interface AIStoryGeneratorProps {
  apiPath: '/api/claude/generate-story' | '/api/claude/expand-story';
  payload: Record<string, string>;
  promptLabel: string;
  onSaveDraft: (story: GeneratedStoryPayload) => Promise<SaveDraftResult | null>;
  onPublished: (storyId: string) => void;
}

const STEP_LABELS: Record<WizardStep, string> = {
  world: '1 · World',
  prompt: '2 · Prompt',
  review: '3 · Review',
  edit: '4 · Edit',
  voice: '5 · Voice',
};

export default function AIStoryGenerator({
  apiPath,
  payload,
  promptLabel,
  onSaveDraft,
  onPublished,
}: AIStoryGeneratorProps) {
  const [step, setStep] = useState<WizardStep>('world');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState<GeneratedStoryPayload | null>(null);
  const [saved, setSaved] = useState<SaveDraftResult | null>(null);
  const [formValues, setFormValues] = useState(payload);

  const [environment, setEnvironment] = useState<EnvironmentType>('village');
  const [characters, setCharacters] = useState<StoryCharacterSlot[]>([
    { name: 'Grandmother', type: 'grandma', position: 1 },
  ]);
  const [useAiVoice, setUseAiVoice] = useState(false);

  const promptPreview = useMemo(() => {
    const parts = Object.entries(formValues)
      .filter(([, v]) => v.trim())
      .map(([, v]) => v);
    return parts[0]?.slice(0, 80) ?? 'Your story will unfold here…';
  }, [formValues]);

  const generate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Generation failed');
      setStory(result.story);
      setStep('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveImmersiveSettings = async (storyId: string) => {
    const response = await fetch(`/api/stories/${storyId}/immersive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment,
        characters: characters.filter((c) => c.name.trim()),
        isImmersive: true,
        animationData: { version: 1, useAiVoice },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save immersive settings');
  };

  const saveDraft = async () => {
    if (!story) return null;
    setPublishing(true);
    setError('');
    try {
      const result = await onSaveDraft(story);
      if (!result) throw new Error('Failed to save draft');
      await saveImmersiveSettings(result.storyId);
      setSaved(result);
      setStep('voice');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      return null;
    } finally {
      setPublishing(false);
    }
  };

  const saveAndPublish = async () => {
    if (!saved) return;
    setPublishing(true);
    setError('');

    try {
      const response = await fetch(`/api/stories/${saved.storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Publish failed');
      onPublished(saved.storyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const canAdvanceFromWorld = characters.some((c) => c.name.trim());
  const canAdvanceFromPrompt = Object.values(formValues).some((v) => v.trim().length > 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STEP_LABELS) as WizardStep[]).map((key) => {
          const active = step === key;
          const done =
            (key === 'world' && step !== 'world') ||
            (key === 'prompt' && ['review', 'edit', 'voice'].includes(step)) ||
            (key === 'review' && ['edit', 'voice'].includes(step)) ||
            (key === 'edit' && step === 'voice');
          return (
            <span
              key={key}
              className={`rounded-full px-3 py-1 font-label-sm uppercase tracking-widest ${
                active
                  ? 'bg-[#520e33] text-[#ffdbd2]'
                  : done
                    ? 'bg-[#ffdbd2] text-[#520e33]'
                    : 'bg-[#fff8f5] text-[#857278] ring-1 ring-[#e9d7d0]'
              }`}
            >
              {STEP_LABELS[key]}
            </span>
          );
        })}
      </div>

      {step === 'world' && (
        <StoryPanel>
          <StoryEyebrow>{promptLabel} · Immersive</StoryEyebrow>
          <StoryTitle>Design the world first</StoryTitle>
          <StoryLead>
            Choose where your story lives and who tells it. This 3D scene is what learners enter —
            preview it before writing a single word.
          </StoryLead>
          <ImmersiveWorldSetup
            environment={environment}
            characters={characters}
            useAiVoice={useAiVoice}
            onEnvironmentChange={setEnvironment}
            onCharactersChange={setCharacters}
            onUseAiVoiceChange={setUseAiVoice}
            previewText={promptPreview}
          />
          {error && <StoryAlert message={error} />}
          <StoryButton
            onClick={() => setStep('prompt')}
            disabled={!canAdvanceFromWorld}
            className="mt-6 w-full"
          >
            Continue to story prompt
          </StoryButton>
        </StoryPanel>
      )}

      {step === 'prompt' && (
        <StoryPanel>
          <StoryEyebrow>{promptLabel}</StoryEyebrow>
          <StoryTitle>Shape your family story</StoryTitle>
          <StoryLead>
            Describe a moment, a value, or a memory. You will review everything before Claude writes
            the draft.
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <StoryButton variant="ghost" onClick={() => setStep('world')} className="flex-1">
              Back
            </StoryButton>
            <StoryButton
              onClick={() => setStep('review')}
              disabled={!canAdvanceFromPrompt}
              className="flex-1"
            >
              Preview before generating
            </StoryButton>
          </div>
        </StoryPanel>
      )}

      {step === 'review' && (
        <StoryPanel>
          <StoryEyebrow>Review</StoryEyebrow>
          <StoryTitle>Ready to generate?</StoryTitle>
          <StoryLead>
            Confirm your immersive world and prompt. You can still edit each sentence after — no need
            to regenerate the whole story.
          </StoryLead>

          <div className="mb-6 overflow-hidden rounded-2xl border border-[#e9d7d0]">
            <ImmersiveWorldSetup
              environment={environment}
              characters={characters}
              useAiVoice={useAiVoice}
              onEnvironmentChange={setEnvironment}
              onCharactersChange={setCharacters}
              onUseAiVoiceChange={setUseAiVoice}
              previewText={promptPreview}
            />
          </div>

          <div className="mb-6 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
            <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">Your prompt</p>
            {Object.entries(formValues).map(([key, value]) =>
              value.trim() ? (
                <p key={key} className="mb-2 font-body-md text-[#524348]">
                  <span className="font-label-sm uppercase text-[#857278]">{key}: </span>
                  {value}
                </p>
              ) : null
            )}
          </div>

          <div className="mb-6 flex flex-wrap gap-2 text-sm text-[#524348]">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-[#e9d7d0]">
              {ENVIRONMENT_LABELS[environment]}
            </span>
            {characters
              .filter((c) => c.name.trim())
              .map((c) => (
                <span key={c.name} className="rounded-full bg-white px-3 py-1 ring-1 ring-[#e9d7d0]">
                  {c.name} · {CHARACTER_META[c.type].label}
                </span>
              ))}
            {useAiVoice && (
              <span className="rounded-full bg-[#520e33] px-3 py-1 text-[#ffdbd2]">AI voice on</span>
            )}
          </div>

          {error && <StoryAlert message={error} />}
          <div className="flex flex-col gap-3 sm:flex-row">
            <StoryButton variant="ghost" onClick={() => setStep('prompt')} className="flex-1">
              Back
            </StoryButton>
            <StoryButton onClick={generate} disabled={loading} className="flex-1">
              {loading ? 'Writing with Claude…' : 'Generate story'}
            </StoryButton>
          </div>
        </StoryPanel>
      )}

      {step === 'edit' && story && (
        <EditableStoryPreview
          story={story}
          onStoryChange={setStory}
          onPublish={saveDraft}
          publishing={publishing}
        />
      )}

      {step === 'voice' && story && (
        <div className="space-y-6">
          <StoryPanel>
            <StoryEyebrow>Voice</StoryEyebrow>
            <h2 className="mb-3 font-headline-md text-headline-md text-[#1e1b18]">
              {useAiVoice ? 'Optional: add your voice' : 'Record each sentence'}
            </h2>
            <StoryLead>
              {useAiVoice
                ? 'AI voice will narrate automatically. Recording your own voice makes it even more personal.'
                : 'Kids hear your voice line by line in the immersive scene. Record each line, or publish and add later.'}
            </StoryLead>

            {saved && (
              <div className="space-y-4">
                {saved.sentences.map((sentence, index) => (
                  <div
                    key={sentence.id}
                    className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
                  >
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
          <StoryButton onClick={saveAndPublish} disabled={publishing} className="w-full">
            {publishing ? 'Publishing…' : 'Publish to library'}
          </StoryButton>
        </div>
      )}
    </div>
  );
}
