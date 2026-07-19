'use client';

import { useState } from 'react';
import { storyInputClass } from '@/components/story/StoryShell';
import { toEditableAppearance } from '@/lib/immersive/character/config';
import type {
  CharacterAccessory,
  CharacterAppearance,
  CharacterType,
  FaceShape,
  GarmentStyle,
  HairStyle,
  PersonalityPose,
  StoryCharacterSlot,
} from '@/lib/immersive/types';

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'braids', label: 'Braids' },
  { value: 'bun', label: 'Bun' },
  { value: 'afro', label: 'Afro' },
  { value: 'wrap', label: 'Headwrap' },
];

const FACE_SHAPES: { value: FaceShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'elder', label: 'Elder' },
];

const GARMENT_STYLES: { value: GarmentStyle; label: string }[] = [
  { value: 'tunic', label: 'Tunic' },
  { value: 'dress', label: 'Dress' },
  { value: 'sash', label: 'Sash' },
  { value: 'collar', label: 'Collar' },
];

const POSES: { value: PersonalityPose; label: string }[] = [
  { value: 'playful', label: 'Playful' },
  { value: 'shy', label: 'Shy' },
  { value: 'confident', label: 'Confident' },
  { value: 'wise', label: 'Wise' },
];

const ACCESSORIES: { value: CharacterAccessory; label: string }[] = [
  { value: 'headwrap', label: 'Headwrap' },
  { value: 'necklace', label: 'Necklace' },
];

interface CharacterAppearanceEditorProps {
  character: StoryCharacterSlot;
  characterType: CharacterType;
  onChange: (appearance: CharacterAppearance) => void;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded-lg border border-[#d7c1c7] bg-white p-0.5"
        aria-label={label}
      />
      <span className="text-sm text-[#524348]">{label}</span>
    </label>
  );
}

export default function CharacterAppearanceEditor({
  character,
  characterType,
  onChange,
}: CharacterAppearanceEditorProps) {
  const [open, setOpen] = useState(false);
  const appearance = toEditableAppearance({ ...character, type: characterType });
  const stripeColors = Array.isArray(appearance.bodyPattern)
    ? appearance.bodyPattern
    : [appearance.garmentColor];
  const isStriped = Array.isArray(appearance.bodyPattern) && appearance.bodyPattern.length >= 2;
  const isDog = characterType === 'dog';

  const patch = (partial: Partial<CharacterAppearance>) => {
    onChange({ ...appearance, ...partial });
  };

  const toggleAccessory = (item: CharacterAccessory) => {
    const current = appearance.accessories ?? [];
    const next = current.includes(item)
      ? current.filter((a) => a !== item)
      : [...current, item];
    patch({ accessories: next });
  };

  return (
    <div className="rounded-xl border border-[#e9d7d0] bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-label-sm uppercase tracking-widest text-[#857278]">
          Customize look
        </span>
        <span className="text-sm text-[#520e33]">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[#e9d7d0] px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              label={isDog ? 'Fur' : 'Skin'}
              value={appearance.skinColor}
              onChange={(skinColor) => patch({ skinColor })}
            />
            <ColorField
              label={isDog ? 'Body' : 'Garment'}
              value={appearance.garmentColor}
              onChange={(garmentColor) =>
                patch({
                  garmentColor,
                  bodyPattern: isStriped
                    ? [garmentColor, ...stripeColors.slice(1)]
                    : garmentColor,
                })
              }
            />
            <ColorField
              label="Accent"
              value={appearance.accentColor}
              onChange={(accentColor) => patch({ accentColor })}
            />
            {!isDog && (
              <>
                <ColorField
                  label="Eyes"
                  value={appearance.eyeColor ?? '#1e1b18'}
                  onChange={(eyeColor) => patch({ eyeColor })}
                />
                <ColorField
                  label="Hair"
                  value={appearance.hairColor ?? '#1e1b18'}
                  onChange={(hairColor) => patch({ hairColor })}
                />
              </>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-[#524348]">
              Height · {((appearance.heightScale ?? 1) * 100).toFixed(0)}%
            </span>
            <input
              type="range"
              min={0.85}
              max={1.3}
              step={0.01}
              value={appearance.heightScale ?? 1}
              onChange={(e) => patch({ heightScale: Number(e.target.value) })}
              className="w-full accent-[#520e33]"
            />
          </label>

          {!isDog && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-[#524348]">Hair</span>
                  <select
                    value={appearance.hairStyle ?? 'short'}
                    onChange={(e) => patch({ hairStyle: e.target.value as HairStyle })}
                    className={storyInputClass}
                  >
                    {HAIR_STYLES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[#524348]">Face</span>
                  <select
                    value={appearance.faceShape ?? 'round'}
                    onChange={(e) => patch({ faceShape: e.target.value as FaceShape })}
                    className={storyInputClass}
                  >
                    {FACE_SHAPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[#524348]">Outfit</span>
                  <select
                    value={appearance.garmentStyle ?? 'tunic'}
                    onChange={(e) => patch({ garmentStyle: e.target.value as GarmentStyle })}
                    className={storyInputClass}
                  >
                    {GARMENT_STYLES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[#524348]">Personality</span>
                  <select
                    value={appearance.personalityPose ?? 'playful'}
                    onChange={(e) =>
                      patch({ personalityPose: e.target.value as PersonalityPose })
                    }
                    className={storyInputClass}
                  >
                    {POSES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#524348]">
                  <input
                    type="checkbox"
                    checked={Boolean(appearance.hasBlush)}
                    onChange={(e) => patch({ hasBlush: e.target.checked })}
                    className="h-4 w-4 rounded border-[#d7c1c7] accent-[#520e33]"
                  />
                  Cheek blush
                </label>
                {ACCESSORIES.map((item) => (
                  <label
                    key={item.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[#524348]"
                  >
                    <input
                      type="checkbox"
                      checked={(appearance.accessories ?? []).includes(item.value)}
                      onChange={() => toggleAccessory(item.value)}
                      className="h-4 w-4 rounded border-[#d7c1c7] accent-[#520e33]"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              {appearance.hasBlush && (
                <ColorField
                  label="Blush color"
                  value={appearance.blushColor ?? '#e8a0a0'}
                  onChange={(blushColor) => patch({ blushColor })}
                />
              )}
            </>
          )}

          {isDog && (
            <label className="block">
              <span className="mb-2 block text-sm text-[#524348]">Personality</span>
              <select
                value={appearance.personalityPose ?? 'playful'}
                onChange={(e) =>
                  patch({ personalityPose: e.target.value as PersonalityPose })
                }
                className={storyInputClass}
              >
                {POSES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isDog && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#524348]">
                <input
                  type="checkbox"
                  checked={isStriped}
                  onChange={(e) => {
                    if (e.target.checked) {
                      patch({
                        bodyPattern: [
                          appearance.garmentColor,
                          appearance.accentColor,
                        ],
                      });
                    } else {
                      patch({ bodyPattern: appearance.garmentColor });
                    }
                  }}
                  className="h-4 w-4 rounded border-[#d7c1c7] accent-[#520e33]"
                />
                Striped garment
              </label>
              {isStriped && (
                <div className="flex flex-wrap gap-3">
                  {stripeColors.map((color, i) => (
                    <ColorField
                      key={`stripe-${i}`}
                      label={`Stripe ${i + 1}`}
                      value={color}
                      onChange={(next) => {
                        const colors = [...stripeColors];
                        colors[i] = next;
                        patch({
                          bodyPattern: colors,
                          garmentColor: colors[0],
                        });
                      }}
                    />
                  ))}
                  {stripeColors.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          bodyPattern: [...stripeColors, appearance.accentColor],
                        })
                      }
                      className="text-sm text-[#520e33] underline-offset-2 hover:underline"
                    >
                      + Stripe
                    </button>
                  )}
                  {stripeColors.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          bodyPattern: stripeColors.slice(0, -1),
                          garmentColor: stripeColors[0],
                        })
                      }
                      className="text-sm text-[#857278] underline-offset-2 hover:underline"
                    >
                      Remove stripe
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
