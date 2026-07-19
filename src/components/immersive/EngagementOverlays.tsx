'use client';

import { useEffect, useMemo, useState } from 'react';
import { useImmersiveStore } from '@/lib/immersive/store';
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

function StarsRow({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`text-lg transition-transform ${
            i < count ? 'scale-110 text-[#FF7956]' : 'text-[#524348]'
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
    <div
      className={`pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center px-4 ${toneClass.includes('animate') ? '' : ''}`}
    >
      <p
        className={`animate-[bounce_0.45s_ease] rounded-full border px-4 py-2 text-sm shadow-lg ${toneClass}`}
        style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
      >
        {message}
      </p>
    </div>
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
  const labels: Record<string, { title: string; blurb: string; emoji: string }> = {
    treasure_hunt: {
      title: 'Treasure hunt',
      blurb: 'Find story treasures in the world',
      emoji: '🔍',
    },
    vocab_match: {
      title: 'Word match',
      blurb: 'Tap the prop for each Kinyarwanda word',
      emoji: '🗣️',
    },
    sequence: {
      title: 'Story order',
      blurb: 'Put the moments back in order',
      emoji: '📖',
    },
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#1e1b18]/65 px-4 py-10">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border-2 border-[#C4A574]/45 bg-[#241810]/96 p-5 shadow-2xl backdrop-blur-sm">
        <p className="text-center font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
          One more adventure?
        </p>
        <h2
          className="mt-2 text-center text-2xl text-[#fff8f5]"
          style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        >
          Pick a quick game
        </h2>
        <p className="mt-1 text-center text-sm text-[#ffdbd2]/75">
          Just one — then you are done.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          {activities.map((activity, index) => {
            const meta = labels[activity.type];
            return (
              <button
                key={activity.type}
                type="button"
                onClick={() => onPick(index)}
                className="flex items-center gap-3 rounded-2xl border-2 border-[#C4A574]/35 bg-[#1e1b18]/85 px-4 py-3.5 text-left transition hover:border-[#FF7956] hover:bg-[#2a1c14]"
              >
                <span className="text-2xl" aria-hidden>
                  {meta.emoji}
                </span>
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
  const correct = picked === activity.correctChoiceId;

  const prompt =
    useRw && activity.promptRw?.trim() ? activity.promptRw.trim() : activity.promptEn;
  const encourage =
    useRw && activity.encouragementRw?.trim()
      ? activity.encouragementRw.trim()
      : activity.encouragementEn;

  const handlePick = (choiceId: string) => {
    if (picked) return;
    const isCorrect = choiceId === activity.correctChoiceId;
    setPicked(choiceId);
    window.setTimeout(() => onAnswer(choiceId, isCorrect), isCorrect ? 1100 : 1700);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center bg-[#1e1b18]/50 px-4 pb-8 pt-24">
      <div className="pointer-events-auto w-full max-w-lg rounded-3xl border-2 border-[#C4A574]/50 bg-[#241810]/96 p-5 shadow-xl backdrop-blur-sm">
        <p className="font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
          Guess the ending
        </p>
        <h2
          className="mt-2 text-xl text-[#fff8f5]"
          style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        >
          {prompt}
        </h2>
        {picked ? (
          <div className="mt-4 space-y-2">
            <p
              className={`text-lg ${correct ? 'text-[#8fd4a0]' : 'text-[#FFB088]'}`}
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {correct ? 'Yes! You felt the story.' : 'Close — here comes the real ending…'}
            </p>
            <p className="font-body-md text-sm text-[#ffdbd2]/90">{encourage}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {activity.choices.map((choice, i) => {
              const label =
                useRw && choice.textRw?.trim() ? choice.textRw.trim() : choice.textEn;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handlePick(choice.id)}
                  className="min-h-12 rounded-2xl border-2 border-[#C4A574]/40 bg-[#1e1b18]/80 px-4 py-3 text-left font-body-md text-[#fff8f5] transition hover:scale-[1.01] hover:border-[#FF7956] active:scale-[0.99]"
                >
                  <span className="mr-2 text-[#C4A574]">{String.fromCharCode(65 + i)}.</span>
                  {label}
                </button>
              );
            })}
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

  return (
    <>
      {celebration && <SoftToast message={celebration} tone="ok" />}
      {softMiss && !celebration && <SoftToast message={softMiss} tone="soft" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border-2 border-[#C4A574]/50 bg-[#241810]/95 px-4 py-3.5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
              Treasure hunt
            </p>
            <StarsRow count={foundPropTypes.length} total={activity.targets.length} />
          </div>
          {targetIndex === 0 && foundPropTypes.length === 0 && (
            <p className="mt-1 text-sm text-[#ffdbd2]/75">{intro}</p>
          )}
          {clue && !celebration && (
            <p
              className="mt-2 text-lg leading-snug text-[#fff8f5]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {clue}
            </p>
          )}
          <p className="mt-1.5 text-xs text-[#C4A574]/90">
            Tap the glowing treasure in the scene
          </p>
          {missCount >= 2 && !celebration && (
            <button
              type="button"
              onClick={onHint}
              className="pointer-events-auto mt-2 min-h-9 rounded-xl bg-[#520e33] px-3 text-xs uppercase tracking-widest text-[#ffdbd2] ring-1 ring-[#FF7956]/50"
            >
              Show me a hint
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
  const prompt =
    useRw && activity.promptRw?.trim() ? activity.promptRw.trim() : activity.promptEn;

  return (
    <>
      {celebration && <SoftToast message={celebration} tone="ok" />}
      {softMiss && !celebration && <SoftToast message={softMiss} tone="soft" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border-2 border-[#C4A574]/50 bg-[#241810]/95 px-4 py-3.5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
              Word match
            </p>
            <StarsRow count={pairIndex} total={activity.pairs.length} />
          </div>
          <p className="mt-1 text-sm text-[#ffdbd2]/75">{prompt}</p>
          <p
            className="mt-2 text-3xl text-[#fff8f5]"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            {pair.wordRw}
          </p>
          <p className="mt-0.5 text-sm text-[#C4A574]">
            means “{pair.glossEn}” — tap it in the world
          </p>
          {missCount >= 2 && !celebration && (
            <button
              type="button"
              onClick={onHint}
              className="pointer-events-auto mt-2 min-h-9 rounded-xl bg-[#520e33] px-3 text-xs uppercase tracking-widest text-[#ffdbd2] ring-1 ring-[#FF7956]/50"
            >
              Glow the answer
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
                      ? 'border-[#FF7956] bg-[#3a2018] scale-[1.02]'
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
    const t = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#1e1b18]/45 px-4">
      <div className="animate-[bounce_0.6s_ease] rounded-3xl border-2 border-[#FF7956]/50 bg-[#241810]/95 px-8 py-6 text-center shadow-2xl">
        <p className="text-3xl" aria-hidden>
          ★
        </p>
        <p
          className="mt-2 text-2xl text-[#fff8f5]"
          style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        >
          {title}
        </p>
      </div>
    </div>
  );
}
