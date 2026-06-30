'use client';

import { useEffect } from 'react';
import ImmersivePreviewPanel from './ImmersivePreviewPanel';
import { storyInputClass } from '@/components/story/StoryShell';
import {
  CHARACTER_META,
  CHARACTER_TYPES,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_PRESETS,
} from '@/lib/immersive/presets';
import { useImmersiveStore } from '@/lib/immersive/store';
import type { CharacterType, EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';

interface ImmersiveWorldSetupProps {
  environment: EnvironmentType;
  characters: StoryCharacterSlot[];
  useAiVoice: boolean;
  onEnvironmentChange: (env: EnvironmentType) => void;
  onCharactersChange: (chars: StoryCharacterSlot[]) => void;
  onUseAiVoiceChange: (value: boolean) => void;
  previewText?: string;
}

export default function ImmersiveWorldSetup({
  environment,
  characters,
  useAiVoice,
  onEnvironmentChange,
  onCharactersChange,
  onUseAiVoiceChange,
  previewText,
}: ImmersiveWorldSetupProps) {
  const setPreviewWorld = useImmersiveStore((s) => s.setPreviewWorld);

  useEffect(() => {
    setPreviewWorld({ environment, characters, useAiVoice });
  }, [environment, characters, useAiVoice, setPreviewWorld]);

  const addCharacter = () => {
    if (characters.length >= 3) return;
    onCharactersChange([...characters, { name: '', type: 'boy', position: characters.length + 1 }]);
  };

  const updateCharacter = (index: number, patch: Partial<StoryCharacterSlot>) => {
    onCharactersChange(
      characters.map((c, i) => (i === index ? { ...c, ...patch, position: i + 1 } : c))
    );
  };

  const removeCharacter = (index: number) => {
    onCharactersChange(
      characters.filter((_, i) => i !== index).map((c, i) => ({ ...c, position: i + 1 }))
    );
  };

  return (
    <div className="space-y-6">
      <ImmersivePreviewPanel
        environment={environment}
        characters={characters}
        previewText={previewText}
        heightClass="h-[360px] md:h-[420px]"
      />

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
        <input
          type="checkbox"
          checked={useAiVoice}
          onChange={(e) => onUseAiVoiceChange(e.target.checked)}
          className="h-5 w-5 rounded border-[#d7c1c7] accent-[#520e33]"
        />
        <div>
          <p className="font-body-md text-[#1e1b18]">AI voice narration</p>
          <p className="text-sm text-[#857278]">
            A warm computer voice reads each line if you skip recording your own.
          </p>
        </div>
      </label>

      <div>
        <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">Setting</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(ENVIRONMENT_PRESETS) as EnvironmentType[]).map((key) => {
            const preset = ENVIRONMENT_PRESETS[key];
            const selected = environment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onEnvironmentChange(key)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-[#520e33] ring-2 ring-[#520e33]/20'
                    : 'border-[#e9d7d0] hover:border-[#C4A574]'
                }`}
              >
                <div
                  className="mb-3 h-12 rounded-lg"
                  style={{
                    background: `linear-gradient(180deg, ${preset.fogColor}, ${preset.groundColor})`,
                  }}
                />
                <p className="font-label-sm uppercase tracking-widest text-[#33001d]">
                  {ENVIRONMENT_LABELS[key]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
          Characters (up to 3)
        </p>
        <div className="space-y-3">
          {characters.map((char, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={char.name}
                onChange={(e) => updateCharacter(index, { name: e.target.value })}
                placeholder="Name"
                className={storyInputClass}
              />
              <select
                value={char.type}
                onChange={(e) =>
                  updateCharacter(index, { type: e.target.value as CharacterType })
                }
                className={storyInputClass}
              >
                {CHARACTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CHARACTER_META[type].label}
                  </option>
                ))}
              </select>
              {characters.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCharacter(index)}
                  className="min-h-12 rounded-xl border border-[#e9d7d0] px-3 text-sm text-[#857278]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {characters.length < 3 && (
          <button
            type="button"
            onClick={addCharacter}
            className="mt-3 text-sm text-[#520e33] underline-offset-2 hover:underline"
          >
            + Add character
          </button>
        )}
      </div>
    </div>
  );
}
