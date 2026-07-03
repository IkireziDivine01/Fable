'use client';

import { MessageCircle } from 'lucide-react';

/** Tiny speech bubble above the character — visible cue without blocking the scene. */
export default function SpeechIndicator() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: '#241810',
        border: '2px solid #C4A574',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
        animation: 'speech-pop 1.4s ease-in-out infinite',
      }}
    >
      <MessageCircle size={14} strokeWidth={2.25} color="#FF7956" fill="#FF7956" fillOpacity={0.2} />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          width: '8px',
          height: '8px',
          backgroundColor: '#241810',
          borderRight: '2px solid #C4A574',
          borderBottom: '2px solid #C4A574',
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />
      <style>{`
        @keyframes speech-pop {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.06); }
        }
      `}</style>
    </div>
  );
}
