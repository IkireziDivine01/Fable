'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { CHARACTER_META, ENVIRONMENT_LABELS } from '@/lib/immersive/presets';
import { useImmersiveStore } from '@/lib/immersive/store';
import type { EnvironmentType, StoryCharacterSlot, StorySceneSpec } from '@/lib/immersive/types';
import { resolveActiveCharacterIndex } from '@/lib/immersive/speaker';
import type { StorySentenceInput } from '@/lib/storyHelpers';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

interface ImmersiveWorldPreviewProps {
  environment: EnvironmentType;
  environmentDescription: string;
  sceneSpec?: StorySceneSpec | null;
  characters: StoryCharacterSlot[];
  sentences: StorySentenceInput[];
  storyTitle: string;
  heightClass?: string;
}

export default function ImmersiveWorldPreview({
  environment,
  environmentDescription,
  sceneSpec = null,
  characters,
  sentences,
  storyTitle,
  heightClass = 'h-[420px] md:h-[520px]',
}: ImmersiveWorldPreviewProps) {
  const setPreviewWorld = useImmersiveStore((s) => s.setPreviewWorld);
  const setCurrentLine = useImmersiveStore((s) => s.setCurrentLine);
  const setActiveCharacterIndex = useImmersiveStore((s) => s.setActiveCharacterIndex);
  const setWorldPreviewActive = useImmersiveStore((s) => s.setWorldPreviewActive);

  const slots = useMemo(
    () => characters.filter((c) => c.name.trim() || c.description?.trim()),
    [characters]
  );
  const displaySlots =
    slots.length > 0
      ? slots
      : characters.length > 0
        ? characters
        : [{ name: 'Storyteller', type: 'grandma' as const, position: 1 }];

  const lines =
    sentences.length > 0
      ? sentences
      : [{ sentenceText: storyTitle, sentenceOrder: 1 }];

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [autoTour, setAutoTour] = useState(true);

  const current = lines[sentenceIndex];
  const activeCharacterIndex = resolveActiveCharacterIndex(
    current,
    displaySlots,
    sentenceIndex
  );
  const activeCharacter = displaySlots[activeCharacterIndex];

  useEffect(() => {
    setWorldPreviewActive(true);
    return () => setWorldPreviewActive(false);
  }, [setWorldPreviewActive]);

  useEffect(() => {
    setPreviewWorld({ environment, characters: displaySlots, sceneSpec, worldPreview: true });
  }, [environment, displaySlots, sceneSpec, setPreviewWorld]);

  useEffect(() => {
    setActiveCharacterIndex(activeCharacterIndex);
    setCurrentLine(current?.sentenceText ?? storyTitle, current?.kinyarwandaText);
  }, [
    activeCharacterIndex,
    current?.kinyarwandaText,
    current?.sentenceText,
    setActiveCharacterIndex,
    setCurrentLine,
    storyTitle,
  ]);

  useEffect(() => {
    if (!autoTour || lines.length <= 1) return;
    const timer = window.setInterval(() => {
      setSentenceIndex((index) => (index + 1) % lines.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoTour, lines.length]);

  const goPrev = () => {
    setAutoTour(false);
    setSentenceIndex((index) => Math.max(0, index - 1));
  };

  const goNext = () => {
    setAutoTour(false);
    setSentenceIndex((index) => Math.min(lines.length - 1, index + 1));
  };

  return (
    <div className="space-y-4">
      <div className={`relative overflow-hidden rounded-2xl border border-[#e9d7d0] ${heightClass}`}>
        <StoryCanvas compact worldPreview showCharacterLabels />

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#1e1b18]/85 via-[#1e1b18]/35 to-transparent p-4 md:p-5">
          <p className="font-label-sm uppercase tracking-widest text-[#ffdbd2]/90">
            Your story world
          </p>
          <p className="mt-1 font-headline-md text-lg text-white md:text-xl">
            {ENVIRONMENT_LABELS[environment]}
          </p>
          {environmentDescription ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#ffdbd2]/90 md:text-base">
              {environmentDescription}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[#ffdbd2]/70">
              Claude matched this setting to your narrative.
            </p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e1b18]/90 via-[#1e1b18]/55 to-transparent p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {displaySlots.map((char, index) => {
              const meta = CHARACTER_META[char.type];
              const label = char.name.trim() || meta.label;
              const active = index === activeCharacterIndex;
              return (
                <button
                  key={`${char.type}-${index}`}
                  type="button"
                  onClick={() => {
                    setAutoTour(false);
                    setSentenceIndex(index % lines.length);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition md:text-sm ${
                    active
                      ? 'border-[#ffdbd2] bg-[#520e33] text-[#ffdbd2]'
                      : 'border-[#ffdbd2]/25 bg-black/25 text-[#ffdbd2]/80 hover:border-[#ffdbd2]/50'
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-70">· {meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#ffdbd2]/20 bg-black/30 p-3 backdrop-blur-sm md:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-[#ffdbd2]/70">
                Line {sentenceIndex + 1} of {lines.length}
                {activeCharacter?.name.trim() ? ` · ${activeCharacter.name} speaking` : ''}
              </p>
              <button
                type="button"
                onClick={() => setAutoTour((value) => !value)}
                className="rounded-full border border-[#ffdbd2]/30 px-3 py-1 text-xs text-[#ffdbd2] hover:border-[#ffdbd2]/60"
              >
                {autoTour ? 'Pause tour' : 'Resume tour'}
              </button>
            </div>
            <p className="font-body-md text-sm text-white md:text-base">
              {current?.sentenceText ?? storyTitle}
            </p>
            {current?.kinyarwandaText && (
              <p className="mt-1 text-sm italic text-[#ffdbd2]/80">{current.kinyarwandaText}</p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={sentenceIndex === 0}
              className="min-h-9 rounded-xl border border-[#ffdbd2]/25 px-3 text-sm text-[#ffdbd2] disabled:opacity-40"
            >
              ← Previous
            </button>
            <div className="flex gap-1">
              {lines.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to line ${index + 1}`}
                  onClick={() => {
                    setAutoTour(false);
                    setSentenceIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === sentenceIndex ? 'w-6 bg-[#ffdbd2]' : 'w-2 bg-[#ffdbd2]/35'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={sentenceIndex >= lines.length - 1}
              className="min-h-9 rounded-xl border border-[#ffdbd2]/25 px-3 text-sm text-[#ffdbd2] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#e9d7d0] bg-white p-4">
          <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">
            Generated setting
          </p>
          <p className="mb-2 font-label-sm uppercase text-[#33001d]">
            {ENVIRONMENT_LABELS[environment]}
          </p>
          <p className="text-sm leading-relaxed text-[#524348]">
            {environmentDescription ||
              'This scene was chosen to match the mood and place in your story.'}
          </p>
        </div>

        <div className="rounded-xl border border-[#e9d7d0] bg-white p-4">
          <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
            Generated characters
          </p>
          <div className="space-y-3">
            {displaySlots.map((char, index) => {
              const meta = CHARACTER_META[char.type];
              const label = char.name.trim() || meta.label;
              return (
                <div
                  key={`${char.type}-${index}`}
                  className={`rounded-lg border p-3 ${
                    index === activeCharacterIndex
                      ? 'border-[#520e33] bg-[#fff8f5]'
                      : 'border-[#e9d7d0] bg-[#fff8f5]/60'
                  }`}
                >
                  <p className="font-body-md text-[#1e1b18]">
                    {label}
                    <span className="ml-2 text-sm text-[#857278]">· {meta.label}</span>
                    {index === activeCharacterIndex && (
                      <span className="ml-2 text-sm text-[#520e33]">· in scene now</span>
                    )}
                  </p>
                  {char.description && (
                    <p className="mt-1 text-sm leading-relaxed text-[#524348]">{char.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
