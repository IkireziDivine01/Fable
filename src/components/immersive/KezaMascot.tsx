'use client';

/** Dedicated Keza mascot — friendlier than the generic story portrait. */
export default function KezaMascot({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 96 110"
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Soft glow */}
      <ellipse cx="48" cy="102" rx="28" ry="6" fill="#000" opacity="0.2" />

      {/* Legs dangling over the card */}
      <rect x="30" y="78" width="12" height="22" rx="6" fill="#A67C52" />
      <rect x="54" y="78" width="12" height="22" rx="6" fill="#A67C52" />
      <ellipse cx="36" cy="100" rx="8" ry="5" fill="#7d4f2e" />
      <ellipse cx="60" cy="100" rx="8" ry="5" fill="#7d4f2e" />

      {/* Dress body */}
      <path
        d="M28 52 C28 52 22 78 22 82 C22 88 34 92 48 92 C62 92 74 88 74 82 C74 78 68 52 68 52 Z"
        fill="#FF7956"
      />
      <path
        d="M32 58 C36 72 42 78 48 78 C54 78 60 72 64 58"
        fill="#ff9a7a"
        opacity="0.45"
      />

      {/* Arms */}
      <rect x="14" y="54" width="14" height="10" rx="5" fill="#A67C52" transform="rotate(-18 21 59)" />
      <rect x="68" y="54" width="14" height="10" rx="5" fill="#A67C52" transform="rotate(18 75 59)" />

      {/* Head */}
      <circle cx="48" cy="36" r="24" fill="#A67C52" />

      {/* Hair / braids */}
      <ellipse cx="48" cy="22" rx="26" ry="16" fill="#1e1b18" />
      <rect x="18" y="30" width="7" height="28" rx="3.5" fill="#1e1b18" />
      <rect x="71" y="30" width="7" height="28" rx="3.5" fill="#1e1b18" />
      <circle cx="21.5" cy="58" r="4" fill="#C4A574" />
      <circle cx="74.5" cy="58" r="4" fill="#C4A574" />

      {/* Cheeks */}
      <circle cx="32" cy="40" r="5" fill="#e8a090" opacity="0.55" />
      <circle cx="64" cy="40" r="5" fill="#e8a090" opacity="0.55" />

      {/* Eyes — big & friendly */}
      <ellipse cx="38" cy="36" rx="5" ry="6" fill="#fff8f5" />
      <ellipse cx="58" cy="36" rx="5" ry="6" fill="#fff8f5" />
      <circle cx="39" cy="37" r="2.8" fill="#1a120c" />
      <circle cx="59" cy="37" r="2.8" fill="#1a120c" />
      <circle cx="40.2" cy="35.5" r="1" fill="#fff8f5" />
      <circle cx="60.2" cy="35.5" r="1" fill="#fff8f5" />

      {/* Smile */}
      <path
        d="M40 46 Q48 54 56 46"
        fill="none"
        stroke="#5c2e1a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Necklace */}
      <path
        d="M36 56 Q48 64 60 56"
        fill="none"
        stroke="#C4A574"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="48" cy="62" r="2.5" fill="#FF7956" />
    </svg>
  );
}
