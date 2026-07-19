'use client';

import { useEffect } from 'react';
import ImmersiveWorldPreview from './ImmersiveWorldPreview';
import CharacterAppearanceEditor from './CharacterAppearanceEditor';
import { storyInputClass, storyTextareaClass } from '@/components/story/StoryShell';
import {
  CHARACTER_META,
  CHARACTER_TYPES,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_PRESETS,
} from '@/lib/immersive/presets';
import { useImmersiveStore } from '@/lib/immersive/store';
import type { CharacterType, EnvironmentType, StoryCharacterSlot, StorySceneSpec } from '@/lib/immersive/types';
import type { StorySentenceInput } from '@/lib/storyHelpers';

interface ImmersiveWorldSetupProps {
  environment: EnvironmentType;
  environmentDescription?: string;
  sceneSpec?: StorySceneSpec | null;
  characters: StoryCharacterSlot[];
  useAiVoice: boolean;
  onEnvironmentChange: (env: EnvironmentType) => void;
  onEnvironmentDescriptionChange?: (value: string) => void;
  onCharactersChange: (chars: StoryCharacterSlot[]) => void;
  onUseAiVoiceChange: (value: boolean) => void;
  previewText?: string;
  showAiDescriptions?: boolean;
  storyTitle?: string;
  storySentences?: StorySentenceInput[];
}

export default function ImmersiveWorldSetup({
  environment,
  environmentDescription = '',
  sceneSpec = null,
  characters,
  useAiVoice,
  onEnvironmentChange,
  onEnvironmentDescriptionChange,
  onCharactersChange,
  onUseAiVoiceChange,
  showAiDescriptions = false,
  storyTitle = 'Your story',
  storySentences = [],
}: ImmersiveWorldSetupProps) {
  const setPreviewWorld = useImmersiveStore((s) => s.setPreviewWorld);

  useEffect(() => {
    setPreviewWorld({ environment, characters, sceneSpec, useAiVoice, worldPreview: true });
  }, [environment, characters, sceneSpec, useAiVoice, setPreviewWorld]);

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
      <ImmersiveWorldPreview
        environment={environment}
        environmentDescription={environmentDescription}
        sceneSpec={sceneSpec}
        characters={characters}
        sentences={storySentences}
        storyTitle={storyTitle}
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
            Mateza reads Kinyarwanda lines with a natural accent; English uses the browser voice when
            you skip recording your own.
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
        {showAiDescriptions && onEnvironmentDescriptionChange && (
          <label className="mt-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Setting description
            </span>
            <textarea
              value={environmentDescription}
              onChange={(e) => onEnvironmentDescriptionChange(e.target.value)}
              rows={3}
              className={storyTextareaClass}
              placeholder="Describe the world your family will enter…"
            />
          </label>
        )}
      </div>

      <div>
        <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
          Characters (up to 3)
        </p>
        <div className="space-y-3">
          {characters.map((char, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
              {showAiDescriptions && (
                <textarea
                  value={char.description ?? ''}
                  onChange={(e) => updateCharacter(index, { description: e.target.value })}
                  rows={2}
                  className={storyTextareaClass}
                  placeholder="Who is this character in the story?"
                />
              )}
              <CharacterAppearanceEditor
                character={char}
                characterType={char.type}
                onChange={(appearance) => updateCharacter(index, { appearance })}
              />
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
