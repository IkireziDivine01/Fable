'use client';

import type { CharacterType } from '@/lib/immersive/types';

interface CharacterPortraitMiniProps {
  type: CharacterType;
  skinColor: string;
  garmentColor: string;
  accentColor: string;
  size?: number;
}

/** Blocky portrait matching the in-scene 3D character style. */
export default function CharacterPortraitMini({
  type,
  skinColor,
  garmentColor,
  accentColor,
  size = 52,
}: CharacterPortraitMiniProps) {
  if (type === 'dog') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden>
        <rect width="52" height="52" fill="#1a120c" />
        <ellipse cx="26" cy="30" rx="16" ry="11" fill={garmentColor} />
        <circle cx="18" cy="18" r="9" fill={garmentColor} />
        <circle cx="34" cy="18" r="9" fill={garmentColor} />
        <circle cx="26" cy="24" r="10" fill={skinColor} />
        <ellipse cx="22" cy="23" rx="2" ry="2.5" fill="#1a120c" />
        <ellipse cx="30" cy="23" rx="2" ry="2.5" fill="#1a120c" />
        <ellipse cx="26" cy="28" rx="3" ry="2" fill="#3d2914" />
        <rect x="8" y="38" width="6" height="10" rx="2" fill={accentColor} />
        <rect x="38" y="38" width="6" height="10" rx="2" fill={accentColor} />
      </svg>
    );
  }

  const hairColor = type === 'grandma' || type === 'grandpa' ? '#6b4423' : '#2d1810';
  const headSize = type === 'grandpa' || type === 'teacher' ? 13 : type === 'grandma' ? 12 : 11;
  const torsoH = type === 'teacher' ? 16 : type === 'grandma' ? 14 : 15;

  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden>
      <rect width="52" height="52" fill="#1a120c" />

      {/* Legs */}
      <rect x="17" y="40" width="7" height="10" rx="2" fill={garmentColor} opacity="0.85" />
      <rect x="28" y="40" width="7" height="10" rx="2" fill={garmentColor} opacity="0.85" />

      {/* Torso */}
      <rect x="15" y={36 - torsoH} width="22" height={torsoH} rx="3" fill={garmentColor} />
      {type === 'girl' && (
        <polygon
          points="26,22 14,36 38,36"
          fill={garmentColor}
          opacity="0.9"
        />
      )}

      {/* Arms */}
      <rect x="9" y={34 - torsoH + 4} width="6" height="12" rx="2" fill={skinColor} />
      <rect x="37" y={34 - torsoH + 4} width="6" height="12" rx="2" fill={skinColor} />

      {/* Head */}
      <circle cx="26" cy={22 - (headSize - 11)} r={headSize} fill={skinColor} />

      {/* Hair / headwrap */}
      {type === 'grandma' && (
        <>
          <path
            d={`M ${26 - headSize} ${22 - headSize + 2} Q 26 ${14 - headSize * 0.3} ${26 + headSize} ${22 - headSize + 2}`}
            fill={accentColor}
          />
          <rect x={26 - headSize} y={20 - headSize} width={headSize * 2} height="6" rx="2" fill={accentColor} />
        </>
      )}
      {type === 'grandpa' && (
        <rect x={26 - headSize} y={14 - headSize} width={headSize * 2} height="8" rx="3" fill={hairColor} />
      )}
      {(type === 'boy' || type === 'girl') && (
        <ellipse cx="26" cy={16 - (headSize - 11)} rx={headSize + 1} ry="6" fill={hairColor} />
      )}
      {type === 'teacher' && (
        <>
          <rect x={26 - headSize} y={14 - headSize} width={headSize * 2} height="7" rx="2" fill={hairColor} />
          <rect x="20" y="28" width="12" height="3" rx="1" fill={accentColor} opacity="0.8" />
        </>
      )}

      {/* Face */}
      <circle cx="22" cy={21 - (headSize - 11)} r="1.8" fill="#1a120c" />
      <circle cx="30" cy={21 - (headSize - 11)} r="1.8" fill="#1a120c" />
      {(type === 'girl' || type === 'boy') && (
        <>
          <circle cx="19" cy={24 - (headSize - 11)} r="2" fill="#e8a090" opacity="0.45" />
          <circle cx="33" cy={24 - (headSize - 11)} r="2" fill="#e8a090" opacity="0.45" />
        </>
      )}
    </svg>
  );
}
