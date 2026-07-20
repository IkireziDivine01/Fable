'use client';

import { AudioLines, ChevronRight, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CharacterPortraitMini from '@/components/immersive/CharacterPortraitMini';
import { CHARACTER_META } from '@/lib/immersive/presets';
import { resolveCharacterAppearance } from '@/lib/immersive/sceneSpec';
import { useImmersiveStore } from '@/lib/immersive/store';
import { tokenizeVisibleDialogue } from '@/lib/immersive/wordSparkGuide';

function useTypewriter(text: string, active: boolean, charsPerSecond = 48) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!text || !active) {
      setVisibleCount(text.length);
      return undefined;
    }

    const intervalMs = 1000 / charsPerSecond;
    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= text.length) {
          window.clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [active, charsPerSecond, text]);

  if (!active) return text;
  return text.slice(0, visibleCount);
}

function VoiceWave({ active }: { active: boolean }) {
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0.45, 0.75, 1, 0.65, 0.35].map((scale, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-[#FF7956]"
          style={{
            height: `${scale * 100}%`,
            animation: active ? 'voice-bar 0.55s ease-in-out infinite alternate' : undefined,
            animationDelay: `${i * 0.08}s`,
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

interface StoryDialogueHudProps {
  compact?: boolean;
}

export default function StoryDialogueHud({ compact = false }: StoryDialogueHudProps) {
  const characters = useImmersiveStore((s) => s.characters);
  const activeCharacterIndex = useImmersiveStore((s) => s.activeCharacterIndex);
  const currentSentenceText = useImmersiveStore((s) => s.currentSentenceText);
  const currentKinyarwandaText = useImmersiveStore((s) => s.currentKinyarwandaText);
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const isPlaying = useImmersiveStore((s) => s.isPlaying);
  const userPaused = useImmersiveStore((s) => s.userPaused);
  const sentenceIndex = useImmersiveStore((s) => s.sentenceIndex);
  const sentenceCount = useImmersiveStore((s) => s.sentenceCount);
  const onDialogueAdvance = useImmersiveStore((s) => s.onDialogueAdvance);
  const engagementMode = useImmersiveStore((s) => s.engagementMode);
  const setActiveWordSpark = useImmersiveStore((s) => s.setActiveWordSpark);
  const onWordSparkOpen = useImmersiveStore((s) => s.onWordSparkOpen);
  const activeWordSpark = useImmersiveStore((s) => s.activeWordSpark);
  const [showTapHint, setShowTapHint] = useState(true);

  const character = characters[activeCharacterIndex] ?? characters[0];
  const meta = character ? CHARACTER_META[character.type] : null;
  const appearance = character ? resolveCharacterAppearance(character) : null;

  const displayText = useMemo(() => {
    if (displayLanguage === 'rw' && (currentKinyarwandaText ?? '').trim()) {
      return currentKinyarwandaText.trim();
    }
    return (currentSentenceText ?? '').trim();
  }, [currentKinyarwandaText, currentSentenceText, displayLanguage]);

  const characterName = character?.name.trim() || meta?.label || 'Storyteller';
  const roleLabel = meta?.label ?? 'Character';
  const typedText = useTypewriter(displayText, isPlaying);
  const lineComplete = !isPlaying && typedText.length >= displayText.length;
  const isLastLine = sentenceCount > 0 && sentenceIndex >= sentenceCount - 1;
  const advanceLabel = isLastLine ? 'Finish' : 'Next';
  /** Keza works anytime during the story — not only after a line finishes */
  const wordsInteractive = engagementMode === 'off' && Boolean(displayText);

  const tokens = useMemo(
    () =>
      wordsInteractive
        ? tokenizeVisibleDialogue(displayText, typedText.length)
        : null,
    [displayText, typedText.length, wordsInteractive]
  );

  const openWordSpark = (word: string) => {
    if (!wordsInteractive || !word.trim()) return;
    setShowTapHint(false);
    onWordSparkOpen?.();
    setActiveWordSpark({
      word: word.trim(),
      sentence: displayText,
      sentenceIndex,
    });
  };

  if (!displayText) return null;

  const portraitSize = compact ? 44 : 52;

  return (
    <>
      <style>{`
        @keyframes voice-bar {
          from { transform: scaleY(0.35); }
          to { transform: scaleY(1); }
        }
        @keyframes hud-enter {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes continue-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes word-tap-hint {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(255, 121, 86, 0.28); }
        }
      `}</style>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 ${
          compact ? 'px-2 pb-2' : 'px-3 pb-3 md:px-4 md:pb-4'
        }`}
      >
        <div
          className="pointer-events-auto mx-auto max-w-3xl"
          style={{ animation: 'hud-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {/* Name banner — sticks up like a JRPG label */}
          <div className={`relative z-10 ${compact ? 'ml-[52px]' : 'ml-[60px] md:ml-[64px]'} inline-flex items-center gap-2`}>
            <div
              className="flex items-center gap-2 rounded-t-lg border-2 border-b-0 px-3 py-1"
              style={{
                backgroundColor: appearance?.garmentColor ?? '#520e33',
                borderColor: '#C4A574',
                fontFamily: "'Baloo 2', cursive, sans-serif",
              }}
            >
              <span className="text-sm font-bold uppercase tracking-wide text-[#fff8f5] md:text-base">
                {characterName}
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-[#ffdbd2]/75 sm:inline">
                · {roleLabel}
              </span>
            </div>
          </div>

          {/* Main dialogue panel */}
          <div
            className="relative flex overflow-hidden rounded-lg rounded-tl-none border-[3px] shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
            style={{
              borderColor: '#C4A574',
              backgroundColor: '#241810',
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(196,165,116,0.04) 3px, rgba(196,165,116,0.04) 4px)',
            }}
          >
            {/* Portrait frame */}
            <div
              className="relative shrink-0 border-r-[3px] p-1.5 md:p-2"
              style={{
                borderColor: '#C4A574',
                backgroundColor: '#1a120c',
              }}
            >
              <div
                className="overflow-hidden border-2"
                style={{ borderColor: appearance?.accentColor ?? '#FF7956' }}
              >
                {character && appearance && (
                  <CharacterPortraitMini
                    type={character.type}
                    skinColor={appearance.skinColor}
                    garmentColor={appearance.garmentColor}
                    accentColor={appearance.accentColor}
                    eyeColor={appearance.eyeColor}
                    hasBlush={appearance.hasBlush}
                    blushColor={appearance.blushColor}
                    bodyPattern={appearance.bodyPattern}
                    accessories={appearance.accessories}
                    hairStyle={appearance.hairStyle}
                    hairColor={appearance.hairColor}
                    faceShape={appearance.faceShape}
                    garmentStyle={appearance.garmentStyle}
                    size={portraitSize}
                  />
                )}
              </div>
              {isPlaying && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#241810] bg-[#FF7956]"
                  aria-label="Speaking"
                >
                  <AudioLines size={12} strokeWidth={2.5} className="text-[#241810]" />
                </div>
              )}
            </div>

            {/* Text area */}
            <div className={`min-w-0 flex-1 ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5 md:px-4 md:py-3'}`}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScrollText size={14} strokeWidth={2} className="shrink-0 text-[#C4A574]" aria-hidden />
                  {isPlaying ? (
                    <span
                      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#C4A574]"
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >
                      <VoiceWave active />
                      Inkuru · tap a word
                    </span>
                  ) : (
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] text-[#857278]"
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    >
                      {userPaused ? 'Paused · tap a word' : 'Tap a word · Keza'}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`max-h-[4.5rem] overflow-y-auto leading-snug text-[#fff8f5] ${
                  compact ? 'text-[13px]' : 'text-sm md:text-[15px]'
                }`}
                style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 500 }}
              >
                {tokens
                  ? (
                    <>
                      {(() => {
                        let firstTappable = true;
                        return tokens.map((token, i) => {
                      if (token.kind === 'gap') {
                        return <span key={`g-${i}`}>{token.text}</span>;
                      }
                      if (!token.tappable) {
                        return <span key={`w-${i}`}>{token.raw}</span>;
                      }
                      const selected =
                        activeWordSpark?.word.toLowerCase() === token.text.toLowerCase() &&
                        activeWordSpark.sentenceIndex === sentenceIndex;
                      const hintPulse = showTapHint && firstTappable;
                      firstTappable = false;
                      return (
                        <button
                          key={`w-${i}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWordSpark(token.text);
                          }}
                          className={`inline rounded-sm px-0.5 transition ${
                            selected
                              ? 'bg-[#FF7956]/35 text-[#fff8f5] underline decoration-[#FF7956] decoration-2 underline-offset-2'
                              : 'underline decoration-[#C4A574]/55 decoration-dotted underline-offset-2 hover:bg-[#FF7956]/20 hover:decoration-[#FF7956]'
                          }`}
                          style={
                            hintPulse
                              ? { animation: 'word-tap-hint 1.4s ease-in-out infinite' }
                              : undefined
                          }
                          aria-label={`Ask Keza about ${token.text}`}
                        >
                          {token.raw}
                        </button>
                      );
                        });
                      })()}
                      {isPlaying && typedText.length < displayText.length && (
                        <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-[#FF7956]" />
                      )}
                    </>
                  )
                  : (
                    <>
                      {typedText}
                      {isPlaying && typedText.length < displayText.length && (
                        <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-[#FF7956]" />
                      )}
                    </>
                  )}
              </div>

              {onDialogueAdvance && (
                <button
                  type="button"
                  onClick={() => onDialogueAdvance()}
                  className={`mt-2.5 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl font-medium tracking-wide transition active:scale-[0.98] ${
                    isLastLine
                      ? 'bg-[#FF7956] text-white shadow-md shadow-[#FF7956]/30'
                      : lineComplete
                        ? 'bg-[#520e33] text-[#ffdbd2] ring-1 ring-[#C4A574]/40'
                        : 'bg-[#241810]/80 text-[#ffdbd2]/90 ring-1 ring-[#C4A574]/25'
                  }`}
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  <span
                    style={{
                      animation: lineComplete
                        ? 'continue-bounce 1.2s ease-in-out infinite'
                        : undefined,
                    }}
                    className="flex items-center gap-1"
                  >
                    {isPlaying && !lineComplete
                      ? isLastLine
                        ? 'Skip to finish'
                        : 'Skip ahead'
                      : advanceLabel}
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
