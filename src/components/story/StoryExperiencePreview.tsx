'use client';

import { useEffect, useState } from 'react';
import ThemeBadge from '@/components/story/ThemeBadge';
import ImmersivePreviewPanel from '@/components/immersive/ImmersivePreviewPanel';
import { StoryButton, StoryEyebrow, StoryLead, StoryPanel, StoryTitle } from '@/components/story/StoryShell';
import { CHARACTER_META, ENVIRONMENT_LABELS } from '@/lib/immersive/presets';
import { useImmersiveStore } from '@/lib/immersive/store';
import type {
  EnvironmentType,
  SceneBrief,
  StoryCharacterSlot,
  StorySceneSpec,
} from '@/lib/immersive/types';
import { resolveActiveCharacterIndex } from '@/lib/immersive/speaker';
import type { GeneratedStoryPayload } from '@/lib/storyHelpers';

interface StoryExperiencePreviewProps {
  story: GeneratedStoryPayload;
  environment: EnvironmentType;
  environmentDescription: string;
  sceneSpec?: StorySceneSpec | null;
  sceneBrief?: SceneBrief | null;
  characters: StoryCharacterSlot[];
  onBack: () => void;
  onContinue: () => void;
  continuing?: boolean;
}

export default function StoryExperiencePreview({
  story,
  environment,
  environmentDescription,
  sceneSpec = null,
  sceneBrief = null,
  characters,
  onBack,
  onContinue,
  continuing = false,
}: StoryExperiencePreviewProps) {
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const setActiveCharacterIndex = useImmersiveStore((s) => s.setActiveCharacterIndex);

  const slots = characters.filter((c) => c.name.trim());
  const total = story.sentences.length;
  const current = story.sentences[sentenceIndex];
  const activeCharacterIndex = resolveActiveCharacterIndex(
    current,
    slots,
    sentenceIndex
  );

  useEffect(() => {
    setActiveCharacterIndex(activeCharacterIndex);
  }, [activeCharacterIndex, setActiveCharacterIndex]);

  const goPrev = () => setSentenceIndex((i) => Math.max(0, i - 1));
  const goNext = () => setSentenceIndex((i) => Math.min(total - 1, i + 1));

  return (
    <div className="space-y-6">
      <StoryPanel>
        <StoryEyebrow>Preview</StoryEyebrow>
        <StoryTitle>See the story before you publish</StoryTitle>
        <StoryLead>
          Step through each line in the 3D world your family will enter. Adjust the world on the
          previous step if something feels off — this is exactly what learners experience.
        </StoryLead>

        <div className="mb-4 overflow-hidden rounded-2xl border border-[#e9d7d0]">
          <ImmersivePreviewPanel
            environment={environment}
            sceneSpec={sceneSpec}
            sceneBrief={sceneBrief}
            characters={slots}
            previewText={current?.sentenceText ?? story.title}
            heightClass="h-[320px] md:h-[400px]"
          />
        </div>

        <div className="mb-4 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-headline-md text-lg text-[#1e1b18]">{story.title}</p>
            <span className="font-label-sm uppercase tracking-widest text-[#857278]">
              Line {sentenceIndex + 1} of {total}
            </span>
          </div>

          {current && (
            <>
              <p className="mb-2 font-body-md text-[#1e1b18]">{current.sentenceText}</p>
              {current.kinyarwandaText && (
                <p className="mb-2 text-sm italic text-[#524348]">{current.kinyarwandaText}</p>
              )}
              {current.themeLabel && <ThemeBadge label={current.themeLabel} />}
            </>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={sentenceIndex === 0}
              className="min-h-10 rounded-xl border border-[#e9d7d0] px-4 text-sm text-[#524348] disabled:opacity-40"
            >
              ← Previous line
            </button>
            <div className="flex gap-1">
              {story.sentences.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to line ${i + 1}`}
                  onClick={() => setSentenceIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === sentenceIndex ? 'w-6 bg-[#520e33]' : 'w-2 bg-[#e9d7d0]'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={sentenceIndex >= total - 1}
              className="min-h-10 rounded-xl border border-[#e9d7d0] px-4 text-sm text-[#524348] disabled:opacity-40"
            >
              Next line →
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#e9d7d0] bg-white p-4">
            <p className="mb-1 font-label-sm uppercase tracking-widest text-[#857278]">Setting</p>
            <p className="mb-2 font-label-sm uppercase text-[#33001d]">
              {ENVIRONMENT_LABELS[environment]}
            </p>
            {environmentDescription ? (
              <p className="text-sm leading-relaxed text-[#524348]">{environmentDescription}</p>
            ) : (
              <p className="text-sm text-[#857278]">No setting description yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-[#e9d7d0] bg-white p-4">
            <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">Characters</p>
            <div className="space-y-3">
              {slots.map((char, index) => (
                <div key={`${char.name}-${index}`}>
                  <p className="font-body-md text-[#1e1b18]">
                    {char.name}
                    <span className="ml-2 text-sm text-[#857278]">
                      · {CHARACTER_META[char.type].label}
                      {index === activeCharacterIndex && sentenceIndex < total ? ' · speaking' : ''}
                    </span>
                  </p>
                  {char.description && (
                    <p className="mt-1 text-sm leading-relaxed text-[#524348]">{char.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </StoryPanel>

      <div className="flex flex-col gap-3 sm:flex-row">
        <StoryButton variant="ghost" onClick={onBack} className="flex-1">
          Back to world
        </StoryButton>
        <StoryButton onClick={onContinue} disabled={continuing} className="flex-1">
          {continuing ? 'Saving…' : 'Looks good — continue to voice'}
        </StoryButton>
      </div>
    </div>
  );
}
