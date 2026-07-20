'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import KezaMascot from '@/components/immersive/KezaMascot';
import { speakNarration } from '@/lib/aiVoice';
import { useImmersiveStore } from '@/lib/immersive/store';
import { WORD_SPARK_GUIDE } from '@/lib/immersive/wordSparkGuide';
import type {
  PredictNextActivity,
  SequenceActivity,
  SequenceBeat,
  TreasureHuntActivity,
  VocabMatchActivity,
  VocabMatchPair,
} from '@/lib/immersive/types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // Avoid leaving order unchanged (feels broken)
  if (copy.length > 1 && copy.every((item, i) => item === items[i])) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function speakLine(
  text: string,
  lang: string,
  stopRef: { current: (() => void) | null }
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      stopRef.current = null;
      resolve();
    };

    const fallbackMs = Math.min(12000, Math.max(2800, text.length * 55));
    const fallback = window.setTimeout(finish, fallbackMs);

    void (async () => {
      try {
        const stop = await speakNarration(text, {
          lang,
          onEnd: () => {
            window.clearTimeout(fallback);
            finish();
          },
        });
        stopRef.current = () => {
          stop();
          window.clearTimeout(fallback);
          finish();
        };
      } catch {
        window.clearTimeout(fallback);
        finish();
      }
    })();
  });
}

function StarsRow({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`text-lg transition-transform duration-300 ${
            i < count ? 'scale-125 text-[#E8B84A]' : 'text-[#524348]'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function SoftToast({ message, tone = 'warm' }: { message: string; tone?: 'warm' | 'ok' | 'soft' }) {
  const toneClass =
    tone === 'ok'
      ? 'border-[#5a8f6a]/50 bg-[#1e2a22]/95 text-[#c8e6d0]'
      : tone === 'soft'
        ? 'border-[#C4A574]/40 bg-[#241810]/95 text-[#ffdbd2]'
        : 'border-[#FF7956]/45 bg-[#2a1810]/95 text-[#fff8f5]';
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center px-4">
      <p
        className={`animate-[bounce_0.45s_ease] rounded-full border px-4 py-2 text-sm shadow-lg ${toneClass}`}
        style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
      >
        {message}
      </p>
    </div>
  );
}

function GameIcon({ kind }: { kind: 'hunt' | 'vocab' | 'sequence' }) {
  if (kind === 'hunt') {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#E8B84A]/60 bg-[#3a2a10] text-xl text-[#E8B84A]"
        aria-hidden
      >
        ★
      </span>
    );
  }
  if (kind === 'vocab') {
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#E8836B]/55 bg-[#3d2418] text-base font-bold text-[#E8D5C4]"
        style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        aria-hidden
      >
        inzu
      </span>
    );
  }
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#C4A574]/55 bg-[#2a1c14] text-sm font-bold tracking-widest text-[#ffdbd2]"
      style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
      aria-hidden
    >
      1·2·3
    </span>
  );
}

export function ActivityChooser({
  activities,
  onPick,
  onSkip,
}: {
  activities: Array<TreasureHuntActivity | VocabMatchActivity | SequenceActivity>;
  onPick: (index: number) => void;
  onSkip: () => void;
}) {
  const labels: Record<
    string,
    { title: string; blurb: string; kind: 'hunt' | 'vocab' | 'sequence'; accent: string }
  > = {
    treasure_hunt: {
      title: 'Treasure hunt',
      blurb: 'Solve Keza’s clues and find hidden treasures',
      kind: 'hunt',
      accent: 'border-[#E8B84A]/45 hover:border-[#E8B84A]',
    },
    vocab_match: {
      title: 'Word match',
      blurb: 'Hear a Kinyarwanda word — tap what it means',
      kind: 'vocab',
      accent: 'border-[#E8836B]/45 hover:border-[#E8836B]',
    },
    sequence: {
      title: 'Story order',
      blurb: 'Put the moments back in order',
      kind: 'sequence',
      accent: 'border-[#C4A574]/35 hover:border-[#FF7956]',
    },
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#1e1b18]/65 px-4 py-10">
      <style>{`
        @keyframes chooser-card-in {
          0% { opacity: 0; transform: translateY(14px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border-2 border-[#C4A574]/45 bg-[#241810]/96 p-5 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <KezaMascot size={72} />
          <p className="mt-2 text-center font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
            One more adventure?
          </p>
          <h2
            className="mt-1 text-center text-2xl text-[#fff8f5]"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            Pick a quick game
          </h2>
          <p className="mt-1 text-center text-sm text-[#ffdbd2]/75">
            Keza says: just one — then you are done.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {activities.map((activity, index) => {
            const meta = labels[activity.type];
            return (
              <button
                key={activity.type}
                type="button"
                onClick={() => onPick(index)}
                className={`flex min-h-[4.25rem] items-center gap-3 rounded-2xl border-2 bg-[#1e1b18]/85 px-4 py-3.5 text-left transition hover:scale-[1.02] hover:bg-[#2a1c14] active:scale-[0.99] ${meta.accent}`}
                style={{
                  animation: `chooser-card-in 0.4s ease ${0.08 + index * 0.08}s both`,
                }}
              >
                <GameIcon kind={meta.kind} />
                <span>
                  <span
                    className="block text-lg text-[#fff8f5]"
                    style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
                  >
                    {meta.title}
                  </span>
                  <span className="block text-sm text-[#ffdbd2]/75">{meta.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-4 w-full py-3 text-sm tracking-wide text-[#C4A574] underline-offset-2 hover:underline"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export function PredictNextOverlay({
  activity,
  onAnswer,
}: {
  activity: PredictNextActivity;
  onAnswer: (choiceId: string, correct: boolean) => void;
}) {
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const useRw = displayLanguage === 'rw';
  const [picked, setPicked] = useState<string | null>(null);
  /** 0 = Keza only → 1 = speech → 2..4 = choices → 5 = ready */
  const [beat, setBeat] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const correct = picked === activity.correctChoiceId;

  const speech = useRw
    ? 'Tekereza — ni iki gikurikira?'
    : 'Take a guess — what comes next?';
  const prompt =
    useRw && activity.promptRw?.trim() ? activity.promptRw.trim() : activity.promptEn;
  const encourage =
    useRw && activity.encouragementRw?.trim()
      ? activity.encouragementRw.trim()
      : activity.encouragementEn;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await delay(550);
      if (cancelled) return;

      setBeat(1);
      await speakLine(speech, displayLanguage, stopRef);
      if (cancelled) return;

      for (let i = 0; i < activity.choices.length; i++) {
        setBeat(2 + i);
        const choice = activity.choices[i];
        const label =
          useRw && choice.textRw?.trim() ? choice.textRw.trim() : choice.textEn;
        const letter = String.fromCharCode(65 + i);
        await speakLine(`${letter}. ${label}`, displayLanguage, stopRef);
        if (cancelled) return;
      }

      setBeat(5);
    })();

    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [activity.choices, displayLanguage, speech, useRw]);

  const handlePick = (choiceId: string) => {
    if (picked || beat < 5) return;
    stopRef.current?.();
    stopRef.current = null;
    const isCorrect = choiceId === activity.correctChoiceId;
    setPicked(choiceId);
    window.setTimeout(() => onAnswer(choiceId, isCorrect), isCorrect ? 1200 : 1800);
  };

  /** beat 2 → A, 3 → A+B, 4 → A+B+C, 5 → all */
  const revealedCount = beat >= 2 ? Math.min(3, beat === 5 ? 3 : beat - 1) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-[120] flex items-center justify-center bg-[#1e1b18]/78 px-4 py-10 backdrop-blur-[2px]">
      <style>{`
        @keyframes predict-keza-hop {
          0% { transform: translate(-50%, -130%) rotate(-12deg) scale(0.55); opacity: 0; }
          60% { transform: translate(-50%, 8%) rotate(4deg) scale(1.06); opacity: 1; }
          100% { transform: translate(-50%, 0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes predict-keza-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes predict-blob-rise {
          0% { transform: scale(0.88) translateY(18px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes predict-choice-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes predict-speech-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        role="dialog"
        aria-label="Guess the ending"
        className="pointer-events-auto relative w-full max-w-md pt-[4.75rem]"
      >
        <div
          className="absolute left-1/2 top-0 z-20"
          style={{
            animation: 'predict-keza-hop 0.7s cubic-bezier(0.22, 1.25, 0.36, 1) both',
          }}
        >
          <div
            style={{
              animation:
                beat >= 1
                  ? 'predict-keza-idle 2.6s ease-in-out 0.15s infinite'
                  : undefined,
            }}
          >
            <KezaMascot size={96} />
          </div>
        </div>

        {beat >= 1 && (
          <div
            className="relative rounded-[2rem] px-5 pb-5 pt-9 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
            style={{
              animation: 'predict-blob-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
              background: '#3d2418',
              border: '3px solid #5c3a28',
            }}
          >
            <p
              className="text-center text-[11px] uppercase tracking-[0.2em] text-[#C4A574]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              {WORD_SPARK_GUIDE.name}
            </p>

            <p
              className="mt-2 text-center text-lg leading-snug text-[#E8D5C4]"
              style={{
                fontFamily: "'Baloo 2', cursive, sans-serif",
                animation: 'predict-speech-in 0.35s ease both',
              }}
            >
              {speech}
            </p>

            {revealedCount > 0 && !picked && (
              <p
                className="mt-3 text-center text-sm text-[#ffdbd2]/75"
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  animation: 'predict-speech-in 0.3s ease both',
                }}
              >
                {prompt}
              </p>
            )}

            {picked ? (
              <div
                className={`mt-4 space-y-2 text-center ${correct ? 'animate-[bounce_0.5s_ease]' : ''}`}
              >
                <p
                  className={`text-lg ${correct ? 'text-[#8fd4a0]' : 'text-[#FFB088]'}`}
                  style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
                >
                  {correct
                    ? useRw
                      ? 'Yego! Wumvise inkuru.'
                      : 'Yes! You felt the story.'
                    : useRw
                      ? 'Hafi — reba uko irangira…'
                      : 'Close — here comes the real ending…'}
                </p>
                <p className="text-sm text-[#ffdbd2]/90">{encourage}</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {activity.choices.map((choice, i) => {
                  if (i >= revealedCount) return null;
                  const label =
                    useRw && choice.textRw?.trim()
                      ? choice.textRw.trim()
                      : choice.textEn;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handlePick(choice.id)}
                      disabled={beat < 5}
                      className="min-h-12 rounded-full border-2 border-[#C4A574]/45 bg-[#2a1810]/95 px-4 py-3 text-left text-sm text-[#fff8f5] transition hover:scale-[1.02] hover:border-[#FF7956] active:scale-[0.99] disabled:pointer-events-none"
                      style={{
                        fontFamily: "'Fredoka', sans-serif",
                        animation: 'predict-choice-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
                      }}
                    >
                      <span
                        className="mr-2 font-bold text-[#FF7956]"
                        style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function HuntClueStrip({
  activity,
  targetIndex,
  missCount,
  onHint,
  celebration,
  softMiss,
}: {
  activity: TreasureHuntActivity;
  targetIndex: number;
  missCount: number;
  onHint: () => void;
  celebration: string | null;
  softMiss?: string | null;
}) {
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const foundPropTypes = useImmersiveStore((s) => s.foundPropTypes);
  const useRw = displayLanguage === 'rw';
  const target = activity.targets[targetIndex];
  if (!target && !celebration) return null;

  const intro =
    useRw && activity.introRw?.trim() ? activity.introRw.trim() : activity.introEn;
  const clue =
    target && (useRw && target.clueRw?.trim() ? target.clueRw.trim() : target.clueEn);
  const treasureNumber = Math.min(targetIndex + 1, activity.targets.length);

  return (
    <>
      {celebration && <SoftToast message={celebration} tone="ok" />}
      {softMiss && !celebration && <SoftToast message={softMiss} tone="soft" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border-2 border-[#E8B84A]/55 bg-[#2a1f10]/96 px-4 py-3.5 shadow-xl shadow-[#E8B84A]/10 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KezaMascot size={36} />
              <div>
                <p className="font-label-sm uppercase tracking-[0.22em] text-[#E8B84A]">
                  Treasure hunt
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[#C4A574]/80">
                  Clue {treasureNumber} of {activity.targets.length}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <StarsRow count={foundPropTypes.length} total={activity.targets.length} />
              <p className="text-[10px] text-[#E8B84A]/80">treasures</p>
            </div>
          </div>

          {targetIndex === 0 && foundPropTypes.length === 0 && (
            <p className="mt-2 text-sm text-[#ffdbd2]/75">{intro}</p>
          )}

          {clue && !celebration && (
            <div className="mt-3 rounded-2xl border border-[#E8B84A]/35 bg-[#1e160c]/90 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#E8B84A]/90">
                Keza’s clue
              </p>
              <p
                className="mt-1 text-lg leading-snug text-[#fff8f5]"
                style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
              >
                {clue}
              </p>
            </div>
          )}

          {celebration && target?.revealEn && (
            <p
              className="mt-2 animate-[bounce_0.45s_ease] text-base text-[#E8B84A]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {useRw && target.revealRw?.trim() ? target.revealRw.trim() : target.revealEn}
            </p>
          )}

          <p className="mt-2 text-xs text-[#C4A574]/90">
            Hunt in the world — tap the glowing treasure
          </p>
          {missCount >= 2 && !celebration && (
            <button
              type="button"
              onClick={onHint}
              className="pointer-events-auto mt-2 min-h-9 rounded-xl bg-[#3a2a10] px-3 text-xs uppercase tracking-widest text-[#E8B84A] ring-1 ring-[#E8B84A]/50"
            >
              Glow the treasure
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function VocabPromptStrip({
  activity,
  pair,
  pairIndex,
  missCount,
  onHint,
  celebration,
  softMiss,
}: {
  activity: VocabMatchActivity;
  pair: VocabMatchPair;
  pairIndex: number;
  missCount: number;
  onHint: () => void;
  celebration: string | null;
  softMiss: string | null;
}) {
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const useRw = displayLanguage === 'rw';
  const [hearing, setHearing] = useState(false);
  const stopHearRef = useRef<(() => void) | null>(null);
  const prompt =
    useRw && activity.promptRw?.trim() ? activity.promptRw.trim() : activity.promptEn;

  const hearWord = async () => {
    if (hearing) return;
    stopHearRef.current?.();
    setHearing(true);
    try {
      const stop = await speakNarration(pair.wordRw, {
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

  // Keza reads each new word when it appears (language game, not a silent hunt)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await delay(350);
      if (cancelled) return;
      stopHearRef.current?.();
      setHearing(true);
      try {
        const stop = await speakNarration(pair.wordRw, {
          lang: 'rw',
          onEnd: () => {
            if (!cancelled) setHearing(false);
            stopHearRef.current = null;
          },
        });
        if (cancelled) {
          stop();
          return;
        }
        stopHearRef.current = () => {
          stop();
          setHearing(false);
          stopHearRef.current = null;
        };
      } catch {
        if (!cancelled) setHearing(false);
      }
    })();
    return () => {
      cancelled = true;
      stopHearRef.current?.();
      stopHearRef.current = null;
    };
  }, [pair.wordRw, pair.propType]);

  return (
    <>
      {celebration && <SoftToast message={celebration} tone="ok" />}
      {softMiss && !celebration && <SoftToast message={softMiss} tone="soft" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div
          className="w-full max-w-sm rounded-[2rem] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            background: '#3d2418',
            border: '3px solid #5c3a28',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KezaMascot size={40} />
              <div>
                <p className="font-label-sm uppercase tracking-[0.22em] text-[#E8836B]">
                  Word match
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[#C4A574]/80">
                  Word {pairIndex + 1} of {activity.pairs.length}
                </p>
              </div>
            </div>
            <p
              className="rounded-full bg-[#2a1810] px-2.5 py-1 text-xs text-[#E8D5C4]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {pairIndex}/{activity.pairs.length}
            </p>
          </div>

          <p className="mt-2 text-center text-sm text-[#ffdbd2]/75">{prompt}</p>

          <div
            className="mx-auto mt-3 w-full bg-[#E8D5C4] px-4 py-3 text-center shadow-inner"
            style={{ borderRadius: '999px' }}
          >
            <p
              className="text-[1.75rem] font-bold leading-none text-[#3d2418]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {pair.wordRw}
            </p>
          </div>

          <p className="mt-2 text-center text-sm text-[#C4A574]">
            means “{pair.glossEn}” — tap it in the world
          </p>

          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => void hearWord()}
              disabled={hearing}
              className="pointer-events-auto flex min-h-10 items-center gap-1.5 rounded-full bg-[#E8836B] px-5 text-sm font-bold text-white disabled:opacity-60"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {hearing ? '…' : 'Hear with Keza'}
            </button>
          </div>

          {missCount >= 2 && !celebration && (
            <button
              type="button"
              onClick={onHint}
              className="pointer-events-auto mx-auto mt-2 flex min-h-9 rounded-xl bg-[#520e33] px-3 text-xs uppercase tracking-widest text-[#ffdbd2] ring-1 ring-[#E8836B]/50"
            >
              Glow the meaning
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function SequenceOverlay({
  activity,
  onComplete,
}: {
  activity: SequenceActivity;
  onComplete: (correct: boolean, score: number) => void;
}) {
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const useRw = displayLanguage === 'rw';
  const [order, setOrder] = useState<SequenceBeat[]>(() => shuffle(activity.beats));
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);

  const prompt =
    useRw && activity.promptRw?.trim() ? activity.promptRw.trim() : activity.promptEn;

  const labels = useMemo(
    () =>
      order.map((beat) =>
        useRw && beat.labelRw?.trim() ? beat.labelRw.trim() : beat.labelEn
      ),
    [order, useRw]
  );

  const swapOrSelect = (index: number) => {
    if (checked) return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    setOrder((prev) => {
      const copy = [...prev];
      [copy[selected], copy[index]] = [copy[index], copy[selected]];
      return copy;
    });
    setSelected(null);
  };

  const check = () => {
    const nextScore = order.reduce(
      (acc, beat, index) => acc + (beat.correctOrder === index ? 1 : 0),
      0
    );
    const perfect = nextScore === order.length;
    const nextAttempts = attempts + 1;
    setScore(nextScore);
    setIsCorrect(perfect);
    setChecked(true);
    setAttempts(nextAttempts);

    if (perfect || nextAttempts >= 2) {
      if (!perfect) {
        setOrder([...activity.beats].sort((a, b) => a.correctOrder - b.correctOrder));
      }
      window.setTimeout(() => onComplete(perfect, nextScore), 1500);
    } else {
      // One friendly retry — never punish with an instant exit
      window.setTimeout(() => {
        setChecked(false);
        setSelected(null);
      }, 1100);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#1e1b18]/70 px-4 py-10">
      <div className="pointer-events-auto w-full max-w-lg rounded-3xl border-2 border-[#C4A574]/50 bg-[#241810]/96 p-5 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3">
          <KezaMascot size={48} />
          <p
            className="text-sm text-[#ffdbd2]/85"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            {useRw ? 'Keza: Shyira ibihe mu buryo!' : 'Keza: Put the story in order!'}
          </p>
        </div>
        <p className="font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
          Story order
        </p>
        <h2
          className="mt-2 text-xl text-[#fff8f5]"
          style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        >
          {prompt}
        </h2>
        <p className="mt-1 text-sm text-[#ffdbd2]/70">
          Tap two cards to swap them
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {order.map((beat, index) => {
            const inPlace = checked && beat.correctOrder === index;
            const wrong = checked && beat.correctOrder !== index;
            return (
              <li key={beat.id}>
                <button
                  type="button"
                  disabled={checked && (isCorrect || attempts >= 2)}
                  onClick={() => swapOrSelect(index)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition ${
                    selected === index
                      ? 'scale-[1.02] border-[#FF7956] bg-[#3a2018]'
                      : inPlace
                        ? 'border-[#5a8f6a]/70 bg-[#1e2a22]'
                        : wrong
                          ? 'border-[#FF7956]/40 bg-[#2a1810]'
                          : 'border-[#C4A574]/35 bg-[#1e1b18]/70 hover:border-[#C4A574]'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#520e33] font-label-sm text-[#ffdbd2]">
                    {index + 1}
                  </span>
                  <span className="flex-1 font-body-md text-sm text-[#fff8f5]">
                    {labels[index]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {checked ? (
          <p
            className="mt-4 text-center text-lg text-[#C4A574]"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            {isCorrect
              ? 'Perfect order!'
              : attempts < 2
                ? `Nice — ${score} of ${order.length}. Try once more!`
                : `${score} of ${order.length} — here is the story path.`}
          </p>
        ) : (
          <button
            type="button"
            onClick={check}
            className="mt-4 min-h-12 w-full rounded-2xl bg-[#FF7956] px-4 font-label-md tracking-widest text-white"
          >
            Check order
          </button>
        )}
      </div>
    </div>
  );
}

export function GameCompleteBurst({
  title,
  onDone,
}: {
  title: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#1e1b18]/50 px-4">
      <style>{`
        @keyframes burst-star {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1); }
        }
        @keyframes burst-card {
          0% { transform: scale(0.7); opacity: 0; }
          55% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="relative">
        {[
          { dx: '-70px', dy: '-60px', delay: '0s' },
          { dx: '75px', dy: '-55px', delay: '0.08s' },
          { dx: '-80px', dy: '40px', delay: '0.14s' },
          { dx: '70px', dy: '45px', delay: '0.2s' },
          { dx: '0px', dy: '-85px', delay: '0.1s' },
          { dx: '0px', dy: '70px', delay: '0.18s' },
        ].map((spark, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 text-2xl text-[#FF7956]"
            style={
              {
                '--dx': spark.dx,
                '--dy': spark.dy,
                animation: `burst-star 1.4s ease-out ${spark.delay} both`,
              } as CSSProperties
            }
            aria-hidden
          >
            ★
          </span>
        ))}
        <div
          className="rounded-3xl border-2 border-[#FF7956]/55 bg-[#241810]/95 px-8 py-7 text-center shadow-2xl"
          style={{ animation: 'burst-card 0.65s cubic-bezier(0.22, 1.2, 0.36, 1) both' }}
        >
          <div className="mx-auto mb-2 flex justify-center">
            <KezaMascot size={64} />
          </div>
          <p className="text-3xl tracking-widest text-[#FF7956]" aria-hidden>
            ★ ★ ★
          </p>
          <p
            className="mt-2 text-2xl text-[#fff8f5]"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
