'use client';

/** Inline-styled bubble for drei Html — global CSS does not reliably reach the portal. */
export default function StoryDialogueBubble({
  characterName,
  text,
}: {
  characterName?: string;
  text: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '196px',
        maxWidth: '196px',
        filter: 'drop-shadow(0 6px 16px rgba(82, 14, 51, 0.22))',
        fontFamily: "'Fredoka', 'Comic Sans MS', cursive, sans-serif",
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#fff8f5',
          border: '2px solid #e9d7d0',
          borderRadius: '20px',
          padding: '10px 14px 12px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        {characterName && (
          <p
            style={{
              margin: '0 0 4px',
              fontFamily: "'Baloo 2', 'Fredoka', cursive, sans-serif",
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#FF7956',
              textAlign: 'center',
            }}
          >
            {characterName}
          </p>
        )}
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1.45,
            color: '#520e33',
            textAlign: 'center',
          }}
        >
          {text}
        </p>
      </div>

      {/* Tail pointing down toward the character */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '-9px',
          width: '16px',
          height: '16px',
          backgroundColor: '#fff8f5',
          borderRight: '2px solid #e9d7d0',
          borderBottom: '2px solid #e9d7d0',
          transform: 'translateX(-50%) rotate(45deg)',
          borderRadius: '0 0 4px 0',
        }}
      />
    </div>
  );
}
