'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
  storyInputClass,
} from '@/components/story/StoryShell';
import {
  CHARACTER_META,
  CHARACTER_TYPES,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_PRESETS,
} from '@/lib/immersive/presets';
import type { CharacterType, EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';

interface ImmersiveSetupWizardProps {
  storyId: string;
  storyTitle: string;
  initialEnvironment?: EnvironmentType;
  initialCharacters?: StoryCharacterSlot[];
  initialIsImmersive?: boolean;
  backHref: string;
}

export default function ImmersiveSetupWizard({
  storyId,
  storyTitle,
  initialEnvironment = 'village',
  initialCharacters = [],
  initialIsImmersive = false,
  backHref,
}: ImmersiveSetupWizardProps) {
  const [environment, setEnvironment] = useState<EnvironmentType>(initialEnvironment);
  const [characters, setCharacters] = useState<StoryCharacterSlot[]>(
    initialCharacters.length > 0
      ? initialCharacters
      : [{ name: 'Grandmother', type: 'grandma', position: 1 }]
  );
  const [isImmersive, setIsImmersive] = useState(initialIsImmersive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const addCharacter = () => {
    if (characters.length >= 3) return;
    setCharacters((prev) => [
      ...prev,
      { name: '', type: 'boy', position: prev.length + 1 },
    ]);
  };

  const updateCharacter = (index: number, patch: Partial<StoryCharacterSlot>) => {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch, position: i + 1 } : c))
    );
  };

  const removeCharacter = (index: number) => {
    setCharacters((prev) =>
      prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, position: i + 1 }))
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/stories/${storyId}/immersive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment,
          characters: characters.filter((c) => c.name.trim()),
          isImmersive,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const envPreset = ENVIRONMENT_PRESETS[environment];

  return (
    <div className="space-y-8">
      <StoryPanel>
        <StoryEyebrow>Immersive · Umwami w&apos;inkuru</StoryEyebrow>
        <StoryTitle>Shape the world for &ldquo;{storyTitle}&rdquo;</StoryTitle>
        <StoryLead>
          Choose where the story lives and who tells it. Learners enter a quiet 3D scene — earth
          tones, family figures, your recorded voices.
        </StoryLead>

        <label className="mb-6 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isImmersive}
            onChange={(e) => setIsImmersive(e.target.checked)}
            className="h-5 w-5 rounded border-[#d7c1c7] accent-[#520e33]"
          />
          <span className="font-body-md text-[#524348]">Enable immersive mode for learners</span>
        </label>

        <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">Setting</p>
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(ENVIRONMENT_PRESETS) as EnvironmentType[]).map((key) => {
            const preset = ENVIRONMENT_PRESETS[key];
            const selected = environment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEnvironment(key)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-[#520e33] ring-2 ring-[#520e33]/20'
                    : 'border-[#e9d7d0] hover:border-[#C4A574]'
                }`}
              >
                <div
                  className="mb-3 h-12 rounded-lg"
                  style={{ background: `linear-gradient(180deg, ${preset.fogColor}, ${preset.groundColor})` }}
                />
                <p className="font-label-sm uppercase tracking-widest text-[#33001d]">
                  {ENVIRONMENT_LABELS[key]}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
          Characters (up to 3)
        </p>
        <div className="mb-4 space-y-3">
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
            className="mb-6 text-sm text-[#520e33] underline-offset-2 hover:underline"
          >
            + Add character
          </button>
        )}

        {error && <StoryAlert message={error} />}
        {saved && (
          <StoryAlert message="Immersive settings saved. Publish the story when ready." tone="success" />
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={backHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#e9d7d0] bg-[#fff8f5] px-5 font-label-md tracking-widest text-[#524348]"
          >
            Back
          </Link>
          <StoryButton onClick={save} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save immersive settings'}
          </StoryButton>
        </div>
      </StoryPanel>

      {/* Preview swatch — traditional palette, not neon */}
      <StoryPanel className="!bg-[#fff8f5]">
        <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">Preview palette</p>
        <div className="flex gap-2">
          {[envPreset.backgroundColor, envPreset.groundColor ?? '', envPreset.accentColor ?? '', '#FF7956'].map(
            (color) => (
              <div
                key={color}
                className="h-10 flex-1 rounded-lg ring-1 ring-[#e9d7d0]"
                style={{ backgroundColor: color }}
              />
            )
          )}
        </div>
      </StoryPanel>
    </div>
  );
}
