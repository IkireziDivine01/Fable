'use client';

import { useState } from 'react';
import EditableStoryPreview from '@/components/story/EditableStoryPreview';
import StoryExperiencePreview from '@/components/story/StoryExperiencePreview';
import SentenceAudioRecorder from '@/components/story/SentenceAudioRecorder';
import StoryGenerationScreen from '@/components/story/StoryGenerationScreen';
import StoryWizardProgress from '@/components/story/StoryWizardProgress';
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
import type {
  EngagementActivity,
  EnvironmentType,
  SceneBrief,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
} from '@/lib/immersive/types';
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

type WizardStep = 'prompt' | 'review' | 'generating' | 'edit' | 'world' | 'preview' | 'voice';

interface AIStoryGeneratorProps {
  apiPath: '/api/claude/generate-story' | '/api/claude/expand-story';
  payload: Record<string, string>;
  promptLabel: string;
  onSaveDraft: (story: GeneratedStoryPayload) => Promise<SaveDraftResult | null>;
  onPublished: (storyId: string) => void;
}

function applyStoryWorld(story: GeneratedStoryPayload): {
  environment: EnvironmentType;
  environmentDescription: string;
  sceneBrief: SceneBrief | null;
  sceneSpec: StorySceneSpec | null;
  sceneEvents: Record<string, SceneEvent> | null;
  hotspots: StoryHotspot[] | null;
  engagementActivities: EngagementActivity[] | null;
  characters: StoryCharacterSlot[];
} {
  const environment = story.environment ?? 'village';
  return {
    environment,
    environmentDescription: story.environmentDescription ?? '',
    sceneBrief: story.sceneBrief ?? null,
    sceneSpec: story.sceneSpec ?? null,
    sceneEvents: story.sceneEvents ?? null,
    hotspots: story.hotspots ?? null,
    engagementActivities: story.engagementActivities ?? null,
    characters:
      story.characters && story.characters.length > 0
        ? story.characters.map((c, i) => ({ ...c, position: i + 1 }))
        : [{ name: 'Grandmother', type: 'grandma', position: 1 }],
  };
}

function promptPreviewText(values: Record<string, string>): string {
  return (
    values.prompt?.trim() ||
    [values.sentenceOne, values.sentenceTwo].filter((v) => v?.trim()).join(' · ') ||
    ''
  );
}

export default function AIStoryGenerator({
  apiPath,
  payload,
  promptLabel,
  onSaveDraft,
  onPublished,
}: AIStoryGeneratorProps) {
  const [step, setStep] = useState<WizardStep>('prompt');
  const [generationProgress, setGenerationProgress] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState<GeneratedStoryPayload | null>(null);
  const [saved, setSaved] = useState<SaveDraftResult | null>(null);
  const [formValues, setFormValues] = useState(payload);

  const [environment, setEnvironment] = useState<EnvironmentType>('village');
  const [environmentDescription, setEnvironmentDescription] = useState('');
  const [sceneBrief, setSceneBrief] = useState<SceneBrief | null>(null);
  const [sceneSpec, setSceneSpec] = useState<StorySceneSpec | null>(null);
  const [sceneEvents, setSceneEvents] = useState<Record<string, SceneEvent> | null>(null);
  const [hotspots, setHotspots] = useState<StoryHotspot[] | null>(null);
  const [engagementActivities, setEngagementActivities] = useState<
    EngagementActivity[] | null
  >(null);
  const [characters, setCharacters] = useState<StoryCharacterSlot[]>([
    { name: 'Grandmother', type: 'grandma', position: 1 },
  ]);
  const [useAiVoice, setUseAiVoice] = useState(false);

  const generate = async () => {
    setStep('generating');
    setGenerationProgress(null);
    setError('');

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Generation failed');

      setGenerationProgress(100);
      await new Promise((r) => window.setTimeout(r, 450));

      const generated = result.story as GeneratedStoryPayload;
      const world = applyStoryWorld(generated);
      setStory(generated);
      setEnvironment(world.environment);
      setEnvironmentDescription(world.environmentDescription);
      setSceneBrief(world.sceneBrief);
      setSceneSpec(world.sceneSpec);
      setSceneEvents(world.sceneEvents);
      setHotspots(world.hotspots);
      setEngagementActivities(world.engagementActivities);
      setCharacters(world.characters);
      setStep('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep('review');
    } finally {
      setGenerationProgress(null);
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
        animationData: {
          version: 2,
          useAiVoice,
          environmentDescription: environmentDescription.trim() || undefined,
          sceneBrief: sceneBrief ?? undefined,
          sceneSpec: sceneSpec ?? undefined,
          sceneEvents: sceneEvents ?? undefined,
          hotspots: hotspots ?? undefined,
          engagementActivities: engagementActivities ?? undefined,
        },
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

  const canAdvanceFromPrompt = Object.values(formValues).some((v) => v.trim().length > 10);
  const canAdvanceFromWorld = characters.some((c) => c.name.trim());
  const isGenerating = step === 'generating';

  return (
    <div className="space-y-6">
      <StoryWizardProgress currentStep={step} generating={isGenerating} />

      {step === 'generating' && (
        <StoryGenerationScreen
          promptPreview={promptPreviewText(formValues)}
          progressOverride={generationProgress}
        />
      )}

      {step === 'prompt' && (
        <StoryPanel>
          <StoryEyebrow>{promptLabel}</StoryEyebrow>
          <StoryTitle>Shape your family story</StoryTitle>
          <StoryLead>
            Describe a moment, a value, or a memory. Claude will write the story and build the
            world — setting and characters — around it.
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
          <StoryButton
            onClick={() => setStep('review')}
            disabled={!canAdvanceFromPrompt}
            className="mt-2 w-full"
          >
            Continue
          </StoryButton>
        </StoryPanel>
      )}

      {step === 'review' && (
        <StoryPanel>
          <StoryEyebrow>Review</StoryEyebrow>
          <StoryTitle>Ready to generate?</StoryTitle>
          <StoryLead>
            Claude will write your story and suggest a setting and characters that fit the narrative.
            You can edit every line and adjust the world before publishing.
          </StoryLead>

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

          {error && <StoryAlert message={error} />}
          <div className="flex flex-col gap-3 sm:flex-row">
            <StoryButton variant="ghost" onClick={() => setStep('prompt')} className="flex-1">
              Back
            </StoryButton>
            <StoryButton onClick={() => void generate()} className="flex-1">
              Generate story & world
            </StoryButton>
          </div>
        </StoryPanel>
      )}

      {step === 'edit' && story && (
        <EditableStoryPreview
          story={story}
          onStoryChange={setStory}
          onPublish={() => setStep('world')}
          publishing={false}
          continueLabel="Continue to world setup"
        />
      )}

      {step === 'world' && story && (
        <StoryPanel>
          <StoryEyebrow>World</StoryEyebrow>
          <StoryTitle>Built around your story</StoryTitle>
          <StoryLead>
            Claude chose this setting and these characters to match your narrative. Walk through the
            live scene below, then tweak names, descriptions, or the setting — the preview updates
            as you go.
          </StoryLead>

          <ImmersiveWorldSetup
            environment={environment}
            environmentDescription={environmentDescription}
            sceneSpec={sceneSpec}
            sceneBrief={sceneBrief}
            characters={characters}
            useAiVoice={useAiVoice}
            onEnvironmentChange={setEnvironment}
            onEnvironmentDescriptionChange={setEnvironmentDescription}
            onCharactersChange={setCharacters}
            onUseAiVoiceChange={setUseAiVoice}
            previewText={story.sentences[0]?.sentenceText ?? story.title}
            storyTitle={story.title}
            storySentences={story.sentences}
            showAiDescriptions
          />

          {error && <StoryAlert message={error} />}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <StoryButton variant="ghost" onClick={() => setStep('edit')} className="flex-1">
              Back to edit
            </StoryButton>
            <StoryButton
              onClick={() => setStep('preview')}
              disabled={!canAdvanceFromWorld}
              className="flex-1"
            >
              Preview the full experience
            </StoryButton>
          </div>
        </StoryPanel>
      )}

      {step === 'preview' && story && (
        <>
          {error && <StoryAlert message={error} />}
          <StoryExperiencePreview
            story={story}
            environment={environment}
            environmentDescription={environmentDescription}
            sceneSpec={sceneSpec}
            sceneBrief={sceneBrief}
            characters={characters}
            onBack={() => setStep('world')}
            onContinue={() => void saveDraft()}
            continuing={publishing}
          />
        </>
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
