'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import KezaMascot from '@/components/immersive/KezaMascot';
import { speakNarration } from '@/lib/aiVoice';
import type { DisplayLanguage } from '@/lib/immersive/types';
import {
  definitionFromVocabPair,
  pickSparkCopy,
  WORD_SPARK_GUIDE,
  type WordSparkDefinition,
} from '@/lib/immersive/wordSparkGuide';
import { useImmersiveStore } from '@/lib/immersive/store';

const definitionCache = new Map<string, WordSparkDefinition>();

function cacheKey(storyId: string | null, word: string, sentenceIndex: number): string {
  return `${storyId ?? 'x'}|${word.toLowerCase()}|${sentenceIndex}`;
}

export default function WordSparkCard() {
  const storyId = useImmersiveStore((s) => s.storyId);
  const activeWordSpark = useImmersiveStore((s) => s.activeWordSpark);
  const setActiveWordSpark = useImmersiveStore((s) => s.setActiveWordSpark);
  const storyLanguage = useImmersiveStore((s) => s.displayLanguage);
  const vocabHints = useImmersiveStore((s) => s.wordSparkVocabHints);

  const [definition, setDefinition] = useState<WordSparkDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sparkLang, setSparkLang] = useState<DisplayLanguage>('en');
  const [hearing, setHearing] = useState(false);
  const [stamping, setStamping] = useState(false);
  const stopHearRef = useRef<(() => void) | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!activeWordSpark) {
      setDefinition(null);
      setLoading(false);
      setError(null);
      stopHearRef.current?.();
      stopHearRef.current = null;
      setHearing(false);
      return;
    }

    setSparkLang(storyLanguage);

    const { word, sentence, sentenceIndex } = activeWordSpark;
    const key = cacheKey(storyId, word, sentenceIndex);
    const cached = definitionCache.get(key);
    if (cached) {
      setDefinition(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const fromVocab = definitionFromVocabPair(word, vocabHints);
    if (fromVocab) {
      definitionCache.set(key, fromVocab);
      setDefinition(fromVocab);
      setLoading(false);
      setError(null);
      return;
    }

    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError(null);
    setDefinition(null);

    void (async () => {
      try {
        const res = await fetch('/api/define-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, sentence }),
        });
        const data = (await res.json()) as WordSparkDefinition & { error?: string };
        if (gen !== fetchGenRef.current) return;
        if (!res.ok) {
          throw new Error(data.error || 'Could not spark that word');
        }
        const next: WordSparkDefinition = {
          wordEn: data.wordEn,
          wordRw: data.wordRw,
          meaningEn: data.meaningEn,
          meaningRw: data.meaningRw,
          whisperEn: data.whisperEn,
          whisperRw: data.whisperRw,
        };
        definitionCache.set(key, next);
        setDefinition(next);
      } catch (err) {
        if (gen !== fetchGenRef.current) return;
        setError(err instanceof Error ? err.message : 'Could not spark that word');
      } finally {
        if (gen === fetchGenRef.current) setLoading(false);
      }
    })();
  }, [activeWordSpark, storyId, storyLanguage, vocabHints]);

  useEffect(() => {
    return () => {
      stopHearRef.current?.();
    };
  }, []);

  if (!activeWordSpark) return null;

  const close = () => {
    stopHearRef.current?.();
    stopHearRef.current = null;
    setHearing(false);
    setActiveWordSpark(null);
    setStamping(false);
  };

  const gotIt = () => {
    if (stamping) return;
    stopHearRef.current?.();
    stopHearRef.current = null;
    setHearing(false);
    setStamping(true);
    window.setTimeout(() => {
      setActiveWordSpark(null);
      setStamping(false);
    }, 520);
  };

  const stopHearing = () => {
    stopHearRef.current?.();
    stopHearRef.current = null;
    setHearing(false);
  };

  /** Keza reads the word, then the meaning — one voice for everything. */
  const kezaReadAll = async (lang: DisplayLanguage = sparkLang) => {
    if (!definition || hearing) return;
    const copy = pickSparkCopy(definition, lang);
    const script = `${copy.word}. ${copy.meaning}`;
    stopHearing();
    setHearing(true);
    try {
      const stop = await speakNarration(script, {
        lang,
        onEnd: () => {
          setHearing(false);
          stopHearRef.current = null;
        },
      });
      stopHearRef.current = () => {
        stop();
        setHearing(false);
        stopHearRef.current = null;
      };
    } catch {
      setHearing(false);
    }
  };

  const word =
    sparkLang === 'rw'
      ? (definition?.wordRw ?? activeWordSpark.word)
      : (definition?.wordEn ?? activeWordSpark.word);
  const copy = definition ? pickSparkCopy(definition, sparkLang) : null;
  const gotItLabel = sparkLang === 'rw' ? 'Yego!' : 'Yay!';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-[120] flex justify-center px-4 md:top-20">
      <style>{`
        @keyframes keza-hop-in {
          0% { transform: translate(-50%, -140%) rotate(-14deg) scale(0.55); opacity: 0; }
          60% { transform: translate(-50%, 6%) rotate(5deg) scale(1.08); opacity: 1; }
          80% { transform: translate(-50%, -3%) rotate(-2deg) scale(0.97); }
          100% { transform: translate(-50%, 0) rotate(0) scale(1); }
        }
        @keyframes blob-rise {
          0% { transform: scale(0.82) translateY(16px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes keza-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes got-it-stamp {
          0% { opacity: 0; transform: scale(1.6) rotate(-12deg); }
          55% { opacity: 1; transform: scale(0.95) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>

      <div
        role="dialog"
        aria-label={`${WORD_SPARK_GUIDE.name} — ${activeWordSpark.word}`}
        className="pointer-events-auto relative w-full max-w-[280px] pt-[4.5rem]"
      >
        {/* Keza sits on top */}
        <div
          className="absolute left-1/2 top-0 z-20"
          style={{ animation: 'keza-hop-in 0.75s cubic-bezier(0.22, 1.25, 0.36, 1) both' }}
        >
          <div style={{ animation: 'keza-idle 2.6s ease-in-out 0.75s infinite' }}>
            <KezaMascot size={100} />
          </div>
        </div>

        {/* Sketch-style cocoa blob — no green backdrop */}
        <div
          className="relative px-5 pb-5 pt-8 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            animation: 'blob-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both',
            borderRadius: '48% 52% 46% 54% / 42% 48% 52% 58%',
            background: '#3d2418',
            border: '3px solid #5c3a28',
          }}
        >
          {stamping && (
            <div
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              aria-hidden
            >
              <span
                className="rounded-full border-4 border-[#8fd4a0] bg-[#1e2a22]/92 px-5 py-2 text-xl font-bold text-[#8fd4a0] shadow-lg"
                style={{
                  fontFamily: "'Baloo 2', cursive, sans-serif",
                  animation: 'got-it-stamp 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) both',
                }}
              >
                {sparkLang === 'rw' ? 'Yego!' : 'Got it!'}
              </span>
            </div>
          )}

          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#2a1810]/80 text-[#e8d5c4]"
          >
            <X size={14} strokeWidth={2.5} />
          </button>

          {/* EN / RW */}
          <div
            className="mx-auto flex w-fit rounded-full bg-[#2a1810] p-1"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => {
                stopHearing();
                setSparkLang('en');
              }}
              className={`min-h-8 rounded-full px-4 text-sm font-bold transition ${
                sparkLang === 'en' ? 'bg-[#E8836B] text-white' : 'text-[#c4a994]'
              }`}
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                stopHearing();
                setSparkLang('rw');
              }}
              className={`min-h-8 rounded-full px-4 text-sm font-bold transition ${
                sparkLang === 'rw' ? 'bg-[#E8836B] text-white' : 'text-[#c4a994]'
              }`}
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              RW
            </button>
          </div>

          {/* Big word pill */}
          <div
            className="mx-auto mt-3 w-full bg-[#E8D5C4] px-4 py-3 text-center shadow-inner"
            style={{ borderRadius: '999px' }}
          >
            <p
              className="truncate text-[1.65rem] font-bold leading-none text-[#3d2418]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {error ? 'Oops!' : word}
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[#3d2418]/35"
                  style={
                    loading
                      ? { animation: `dot-pulse 1s ease-in-out ${i * 0.15}s infinite` }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Meaning — short, kid-friendly */}
          {copy && !loading && !error && (
            <p
              className="mx-auto mt-3 max-w-[14rem] text-center text-sm leading-snug text-[#E8D5C4]"
              style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 500 }}
            >
              {copy.meaning}
            </p>
          )}

          {/* Keza voice — reads word + meaning */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => void kezaReadAll()}
              disabled={loading || !definition || hearing}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#E8836B] px-6 text-white disabled:opacity-50"
              style={{
                fontFamily: "'Baloo 2', cursive, sans-serif",
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), 0 3px 0 #c45f4a',
              }}
            >
              <Volume2 size={16} strokeWidth={2.5} />
              <span className="text-base font-bold">
                {hearing ? '…' : WORD_SPARK_GUIDE.name}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={gotIt}
            disabled={stamping}
            className="mx-auto mt-4 flex min-h-11 w-[70%] items-center justify-center rounded-full bg-[#C4A574] text-lg font-bold text-[#3d2418] active:translate-y-0.5 disabled:opacity-80"
            style={{
              fontFamily: "'Baloo 2', cursive, sans-serif",
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), 0 3px 0 #8a7350',
            }}
          >
            {gotItLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
