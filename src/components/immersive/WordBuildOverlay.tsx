'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import KezaMascot from '@/components/immersive/KezaMascot';
import { speakNarration } from '@/lib/aiVoice';
import { FABLE } from '@/lib/themes';
import { buildWordPuzzles, kidWordBlurb, type WordBuildPuzzle } from '@/lib/immersive/wordBuild';
import type { VocabMatchActivity } from '@/lib/immersive/types';

/** Chunky letter tiles — Fable coral / gold / burgundy / peach only */
const CHOICE_STYLES = [
  {
    shape: 'rounded-[2rem]',
    bg: FABLE.coral,
    shadow: '#c94e32',
    rotate: '-rotate-3',
  },
  {
    shape: 'rounded-full',
    bg: '#C4A574',
    shadow: '#8B6914',
    rotate: 'rotate-2',
  },
  {
    shape: 'rounded-[1.6rem]',
    bg: FABLE.burgundy,
    shadow: '#33001d',
    rotate: '-rotate-2',
  },
  {
    shape: 'rounded-[2.4rem_1.2rem_2.4rem_1.2rem]',
    bg: '#ee6744',
    shadow: '#a7391c',
    rotate: 'rotate-3',
  },
] as const;

type Feedback = 'idle' | 'wrong' | 'right';

export default function WordBuildOverlay({
  activity,
  onComplete,
}: {
  activity: VocabMatchActivity;
  onComplete: (score: number, total: number) => void;
}) {
  const puzzles = useMemo(() => buildWordPuzzles(activity.pairs), [activity.pairs]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);
  const [shake, setShake] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [stageIn, setStageIn] = useState(false);
  const stopHearRef = useRef<(() => void) | null>(null);

  const puzzle: WordBuildPuzzle | undefined = puzzles[index];
  const total = puzzles.length;
  const blurb = puzzle ? kidWordBlurb(puzzle.propType, puzzle.glossEn) : '';

  const hearWord = async (word: string) => {
    if (!word) return;
    stopHearRef.current?.();
    setHearing(true);
    try {
      const stop = await speakNarration(word, {
        lang: 'rw',
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

  // Fun entrance for the whole party
  useEffect(() => {
    setStageIn(false);
    const id = window.requestAnimationFrame(() => setStageIn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!puzzle) return;
    setFeedback('idle');
    setPicked(null);
    setFilled(false);
    setShake(false);
    let cancelled = false;
    void (async () => {
      await new Promise((r) => window.setTimeout(r, 520));
      if (!cancelled) await hearWord(puzzle.word);
    })();
    return () => {
      cancelled = true;
      stopHearRef.current?.();
      stopHearRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.word, index]);

  useEffect(() => {
    if (total === 0) {
      onComplete(0, 0);
    }
  }, [onComplete, total]);

  if (!puzzle || total === 0) {
    return null;
  }

  const onPick = (letter: string) => {
    if (feedback !== 'idle') return;
    setPicked(letter);

    if (letter === puzzle.correctLetter) {
      setFilled(true);
      setFeedback('right');
      const nextScore = score + 1;
      setScore(nextScore);
      window.setTimeout(() => {
        if (index + 1 >= total) {
          onComplete(nextScore, total);
        } else {
          setIndex((i) => i + 1);
        }
      }, 1100);
      return;
    }

    setFeedback('wrong');
    setShake(true);
    window.setTimeout(() => {
      setShake(false);
      setFeedback('idle');
      setPicked(null);
    }, 700);
  };

  return (
    <div
      className={`relative flex min-h-[100dvh] flex-col overflow-hidden px-4 pb-8 pt-6 transition-opacity duration-500 ${
        stageIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <style>{`
        @keyframes party-rise {
          0% { transform: translateY(28px) scale(0.92); opacity: 0; }
          70% { transform: translateY(-4px) scale(1.03); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes letter-pop {
          0% { transform: scale(0.55) rotate(-10deg); opacity: 0; }
          65% { transform: scale(1.14) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes float-blob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        @keyframes slot-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-12px) scale(1.08); }
          70% { transform: translateY(3px) scale(0.98); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-7deg); }
          75% { transform: rotate(7deg); }
        }
        @keyframes keza-wave {
          0%, 100% { transform: rotate(0deg) scale(1); }
          40% { transform: rotate(-8deg) scale(1.06); }
          70% { transform: rotate(6deg) scale(1.04); }
        }
        @keyframes card-swap {
          0% { transform: translateX(40px) rotate(2deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Fable cream world */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 15% 0%, rgba(255,121,86,0.28), transparent 42%),
            radial-gradient(ellipse at 90% 15%, rgba(196,165,116,0.35), transparent 40%),
            radial-gradient(ellipse at 50% 100%, rgba(82,14,51,0.12), transparent 48%),
            linear-gradient(180deg, ${FABLE.cream} 0%, ${FABLE.peach} 55%, #f0d4c8 100%)
          `,
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <span
          className="absolute left-[7%] top-[14%] h-14 w-14 rounded-full bg-[#FF7956]/30"
          style={{ animation: 'float-blob 4.5s ease-in-out infinite' }}
        />
        <span
          className="absolute right-[9%] top-[16%] h-11 w-11 rotate-12 bg-[#C4A574]/45"
          style={{
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            animation: 'float-blob 5.2s ease-in-out infinite 0.4s',
          }}
        />
        <span
          className="absolute bottom-[24%] left-[5%] h-12 w-12 rounded-[1.1rem] bg-[#520e33]/18"
          style={{ animation: 'float-blob 6s ease-in-out infinite 0.8s' }}
        />
        <span
          className="absolute bottom-[30%] right-[7%] h-9 w-9 rounded-full bg-[#FF7956]/25"
          style={{ animation: 'float-blob 4.8s ease-in-out infinite 0.2s' }}
        />
        <span
          className="absolute left-[48%] top-[7%] text-2xl text-[#C4A574]/80"
          style={{ animation: 'float-blob 5.5s ease-in-out infinite 1s' }}
        >
          ★
        </span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div
          className="flex items-start justify-between gap-3"
          style={{
            animation: stageIn ? 'party-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both' : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-full bg-[#fff8f5] p-1.5 shadow-md ring-4 ring-[#FF7956]/30"
              style={{ animation: stageIn ? 'keza-wave 1.1s ease 0.2s both' : undefined }}
            >
              <KezaMascot size={56} />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#520e33]"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Letter Party
              </p>
              <h1
                className="text-2xl leading-tight text-[#1e1b18] sm:text-3xl"
                style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
              >
                Build the word!
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex gap-1">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`text-xl transition-transform ${
                    i < score ? 'scale-110 text-[#FF7956]' : 'text-[#d7c1c7]'
                  }`}
                  aria-hidden
                >
                  ★
                </span>
              ))}
            </div>
            <p
              className="mt-0.5 text-sm font-bold text-[#524348]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {Math.min(index + 1, total)} / {total}
            </p>
          </div>
        </div>

        {/* Bilingual meaning — no sticker icons */}
        <div
          key={`card-${index}`}
          className="mt-5 rounded-[1.75rem] border-2 border-[#e9d7d0] bg-[#fff8f5] px-4 py-4 shadow-[0_10px_0_rgba(82,14,51,0.12)]"
          style={{
            animation: 'card-swap 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#857278]"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Learn this word
          </p>

          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p
              className="text-3xl font-bold leading-none text-[#520e33] sm:text-4xl"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {puzzle.glossEn}
            </p>
            <p
              className="pb-0.5 text-lg font-bold text-[#FF7956]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              · {puzzle.word}
            </p>
          </div>

          <p
            className="mt-2 text-sm leading-snug text-[#524348]"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            {blurb}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full bg-[#ffdbd2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#520e33]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              EN · {puzzle.glossEn}
            </span>
            <span
              className="rounded-full bg-[#520e33] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ffdbd2]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              RW · {puzzle.word}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void hearWord(puzzle.word)}
            disabled={hearing}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FF7956] px-5 text-white shadow-[0_5px_0_#c94e32] transition active:translate-y-1 active:shadow-none disabled:opacity-70"
          >
            <Volume2 size={20} strokeWidth={2.5} aria-hidden />
            <span
              className="text-base font-bold"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {hearing ? 'Listening…' : 'Hear the word'}
            </span>
          </button>
        </div>

        <p
          key={`hint-${index}-${feedback}`}
          className="mt-5 text-center text-lg font-bold text-[#520e33]"
          style={{
            fontFamily: "'Baloo 2', cursive, sans-serif",
            animation: 'party-rise 0.4s ease both',
          }}
        >
          {feedback === 'right'
            ? `Yes! ${puzzle.word} ★`
            : feedback === 'wrong'
              ? 'Oops — try another letter!'
              : 'Tap the missing letter'}
        </p>

        <div
          key={`slots-${index}`}
          className={`mt-3 flex flex-wrap items-center justify-center gap-2 ${
            shake ? 'animate-[wiggle_0.45s_ease]' : ''
          }`}
        >
          {puzzle.slots.map((slot, i) => {
            const show = !slot.blank || filled;
            const isBlank = slot.blank && !filled;
            return (
              <span
                key={`${puzzle.word}-${i}`}
                className={`flex h-14 w-12 items-center justify-center text-2xl font-bold sm:h-16 sm:w-14 sm:text-3xl ${
                  isBlank
                    ? 'rounded-2xl border-4 border-dashed border-[#FF7956] bg-white/80 text-[#FF7956]'
                    : filled && slot.blank
                      ? 'rounded-2xl border-4 border-white bg-[#FF7956] text-white shadow-[0_5px_0_#c94e32]'
                      : 'rounded-2xl border-4 border-white bg-[#520e33] text-[#ffdbd2] shadow-[0_5px_0_#33001d]'
                }`}
                style={{
                  fontFamily: "'Baloo 2', cursive, sans-serif",
                  animation:
                    filled && slot.blank
                      ? 'slot-bounce 0.55s ease'
                      : `letter-pop 0.45s ease ${0.08 + i * 0.05}s both`,
                }}
              >
                {show ? slot.char : '?'}
              </span>
            );
          })}
        </div>

        <div key={`choices-${index}`} className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {puzzle.choices.map((letter, i) => {
            const style = CHOICE_STYLES[i % CHOICE_STYLES.length];
            const isPicked = picked === letter;
            const isCorrectPick = feedback === 'right' && letter === puzzle.correctLetter;
            const isWrongPick = feedback === 'wrong' && letter === picked;
            return (
              <button
                key={`${letter}-${i}`}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => onPick(letter)}
                className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center text-3xl font-bold text-white transition sm:h-20 sm:w-20 sm:text-4xl ${style.shape} ${style.rotate} ${
                  isWrongPick ? 'opacity-40' : ''
                } ${isCorrectPick ? 'scale-110' : ''} disabled:cursor-default`}
                style={{
                  fontFamily: "'Baloo 2', cursive, sans-serif",
                  background: style.bg,
                  boxShadow:
                    isPicked && feedback === 'right'
                      ? `0 0 0 4px #fff8f5, 0 8px 0 ${style.shadow}`
                      : `0 7px 0 ${style.shadow}`,
                  animation: `letter-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${0.2 + i * 0.07}s both`,
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <p
          className="mt-auto pt-8 text-center text-sm font-bold text-[#857278]"
          style={{
            fontFamily: "'Baloo 2', cursive, sans-serif",
            animation: stageIn ? 'party-rise 0.7s ease 0.35s both' : undefined,
          }}
        >
          Keza loves how you play with letters!
        </p>
      </div>
    </div>
  );
}
