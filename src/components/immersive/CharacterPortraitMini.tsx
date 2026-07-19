'use client';

import type {
  CharacterAccessory,
  CharacterType,
  FaceShape,
  GarmentStyle,
  HairStyle,
} from '@/lib/immersive/types';

interface CharacterPortraitMiniProps {
  type: CharacterType;
  skinColor: string;
  garmentColor: string;
  accentColor: string;
  eyeColor?: string;
  hasBlush?: boolean;
  blushColor?: string;
  bodyPattern?: string | string[];
  accessories?: CharacterAccessory[];
  hairStyle?: HairStyle;
  hairColor?: string;
  faceShape?: FaceShape;
  garmentStyle?: GarmentStyle;
  size?: number;
}

function torsoStripes(
  colors: string[],
  torsoTop: number,
  torsoH: number,
  centerX: number,
  width: number
) {
  const bandH = torsoH / colors.length;
  return colors.map((color, i) => (
    <rect
      key={`stripe-${i}`}
      x={centerX - width / 2}
      y={torsoTop + i * bandH}
      width={width}
      height={bandH + 0.5}
      fill={color}
    />
  ));
}

/** Blocky portrait matching the in-scene 3D character style. */
export default function CharacterPortraitMini({
  type,
  skinColor,
  garmentColor,
  accentColor,
  eyeColor = '#1a120c',
  hasBlush = false,
  blushColor = '#e8a090',
  bodyPattern,
  accessories = [],
  hairStyle,
  hairColor,
  faceShape,
  garmentStyle,
  size = 52,
}: CharacterPortraitMiniProps) {
  const garmentColors = Array.isArray(bodyPattern)
    ? bodyPattern
    : typeof bodyPattern === 'string' && bodyPattern.startsWith('#')
      ? [bodyPattern]
      : [garmentColor];
  const resolvedHairStyle =
    hairStyle ?? (type === 'grandma' ? 'wrap' : type === 'girl' ? 'braids' : 'short');
  const resolvedHairColor =
    hairColor ?? (type === 'grandma' || type === 'grandpa' ? '#6b4423' : '#2d1810');
  const resolvedFace = faceShape ?? (type === 'grandma' || type === 'grandpa' ? 'elder' : 'round');
  const resolvedGarment =
    garmentStyle ?? (type === 'girl' || type === 'grandma' ? 'dress' : type === 'teacher' ? 'collar' : 'tunic');
  const showHeadwrap =
    resolvedHairStyle === 'wrap' || type === 'grandma' || accessories.includes('headwrap');
  const showNecklace = accessories.includes('necklace');

  if (type === 'dog') {
    return (
      <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden>
        <rect width="52" height="52" fill="#1a120c" />
        <ellipse cx="26" cy="30" rx="16" ry="11" fill={garmentColors[0]} />
        <circle cx="18" cy="18" r="9" fill={garmentColors[0]} />
        <circle cx="34" cy="18" r="9" fill={garmentColors[0]} />
        <circle cx="26" cy="24" r="10" fill={skinColor} />
        <ellipse cx="22" cy="23" rx="2" ry="2.5" fill={eyeColor} />
        <ellipse cx="30" cy="23" rx="2" ry="2.5" fill={eyeColor} />
        <ellipse cx="26" cy="28" rx="3" ry="2" fill="#3d2914" />
        <ellipse cx="40" cy="28" rx="4" ry="2.5" fill={accentColor} transform="rotate(25 40 28)" />
        <rect x="8" y="38" width="6" height="10" rx="2" fill={accentColor} />
        <rect x="38" y="38" width="6" height="10" rx="2" fill={accentColor} />
      </svg>
    );
  }

  const headSize =
    resolvedFace === 'elder' ? 13 : resolvedFace === 'oval' ? 10.5 : type === 'teacher' ? 13 : 11;
  const torsoH =
    resolvedGarment === 'dress' ? 17 : type === 'teacher' ? 16 : type === 'grandma' ? 14 : 15;
  const torsoW = resolvedGarment === 'dress' ? 24 : 22;
  const headCy = 22 - (headSize - 11);
  const torsoTop = 36 - torsoH;
  const showBlush = hasBlush;

  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden>
      <rect width="52" height="52" fill="#1a120c" />

      <rect x="17" y="40" width="7" height="10" rx="2" fill={garmentColors[0]} opacity="0.85" />
      <rect x="28" y="40" width="7" height="10" rx="2" fill={garmentColors[0]} opacity="0.85" />

      {garmentColors.length > 1 ? (
        torsoStripes(garmentColors, torsoTop, torsoH, 26, torsoW)
      ) : (
        <rect
          x={26 - torsoW / 2}
          y={torsoTop}
          width={torsoW}
          height={torsoH}
          rx="3"
          fill={garmentColors[0]}
        />
      )}
      {resolvedGarment === 'dress' && (
        <polygon
          points="26,22 12,38 40,38"
          fill={garmentColors[garmentColors.length - 1]}
          opacity="0.9"
        />
      )}
      {resolvedGarment === 'collar' && (
        <rect x="20" y="28" width="12" height="3" rx="1" fill={accentColor} opacity="0.9" />
      )}
      {(resolvedGarment === 'sash' || resolvedGarment === 'tunic') && (
        <rect x="15" y="34" width="22" height="3" rx="1" fill={accentColor} />
      )}

      <rect x="9" y={34 - torsoH + 4} width="6" height="12" rx="2" fill={skinColor} />
      <rect x="37" y={34 - torsoH + 4} width="6" height="12" rx="2" fill={skinColor} />

      <ellipse
        cx="26"
        cy={headCy}
        rx={resolvedFace === 'oval' ? headSize * 0.9 : headSize}
        ry={resolvedFace === 'oval' ? headSize * 1.1 : headSize}
        fill={skinColor}
      />

      {showHeadwrap && (
        <>
          <path
            d={`M ${26 - headSize} ${headCy - headSize + 2} Q 26 ${14 - headSize * 0.3} ${26 + headSize} ${headCy - headSize + 2}`}
            fill={accentColor}
          />
          <rect
            x={26 - headSize}
            y={headCy - headSize}
            width={headSize * 2}
            height="6"
            rx="2"
            fill={accentColor}
          />
        </>
      )}
      {!showHeadwrap && resolvedHairStyle === 'afro' && (
        <circle cx="26" cy={headCy - 2} r={headSize + 4} fill={resolvedHairColor} />
      )}
      {!showHeadwrap && resolvedHairStyle === 'bun' && (
        <>
          <ellipse cx="26" cy={16 - (headSize - 11)} rx={headSize + 1} ry="5" fill={resolvedHairColor} />
          <circle cx="26" cy={headCy - headSize + 2} r="4" fill={resolvedHairColor} />
        </>
      )}
      {!showHeadwrap && resolvedHairStyle === 'braids' && (
        <>
          <ellipse cx="26" cy={16 - (headSize - 11)} rx={headSize + 1} ry="5" fill={resolvedHairColor} />
          <rect x="14" y={headCy} width="3" height="10" rx="1.5" fill={resolvedHairColor} />
          <rect x="35" y={headCy} width="3" height="10" rx="1.5" fill={resolvedHairColor} />
        </>
      )}
      {!showHeadwrap && resolvedHairStyle === 'short' && (
        <ellipse cx="26" cy={16 - (headSize - 11)} rx={headSize + 1} ry="6" fill={resolvedHairColor} />
      )}

      {showNecklace && (
        <ellipse
          cx="26"
          cy={headCy + headSize - 1}
          rx="7"
          ry="2.5"
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
        />
      )}

      <circle cx="22" cy={headCy - 1} r="1.8" fill={eyeColor} />
      <circle cx="30" cy={headCy - 1} r="1.8" fill={eyeColor} />
      {showBlush && (
        <>
          <circle cx="19" cy={headCy + 2} r="2" fill={blushColor} opacity="0.45" />
          <circle cx="33" cy={headCy + 2} r="2" fill={blushColor} opacity="0.45" />
        </>
      )}
    </svg>
  );
}
