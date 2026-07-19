'use client';

import Link from 'next/link';
import StoryRecommendations from '@/components/story/StoryRecommendations';
import { useEffect, useRef, useState } from 'react';
import ThemeBadge from '@/components/story/ThemeBadge';
import { CheckCircleIcon } from '@/components/HeroIcons';

export interface KidSentence {
  id: string;
  sentence_text: string;
  sentence_order: number;
  speaker?: string | null;
  kinyarwanda_text?: string | null;
  theme_label?: string | null;
  child_prompt?: string | null;
  audio_url?: string | null;
}

interface KidStoryReaderProps {
  storyId: string;
  title: string;
  sentences: KidSentence[];
  isImmersive?: boolean;
  onComplete?: () => void;
}

export default function KidStoryReader({
  storyId,
  title,
  sentences,
  isImmersive = false,
  onComplete,
}: KidStoryReaderProps) {
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = sentences[index];
  const total = sentences.length;
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  useEffect(() => {
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [index]);

  const playAudio = async () => {
    if (!current?.audio_url || !audioRef.current) return;
    try {
      setPlaying(true);
      audioRef.current.src = current.audio_url;
      await audioRef.current.play();
    } catch {
      setPlaying(false);
    }
  };

  const goNext = () => {
    if (index >= total - 1) {
      setCompleted(true);
      onComplete?.();
      return;
    }
    setIndex((prev) => prev + 1);
  };

  if (completed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative mb-6">
          <div className="absolute -inset-4 animate-ping rounded-full bg-[#FF7956]/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#520e33] text-4xl">
            ✨
          </div>
        </div>
        <CheckCircleIcon className="mb-4 h-14 w-14 text-[#FF7956]" />
        <h1 className="mb-3 font-headline-lg text-headline-lg text-[#520e33]">You did it!</h1>
        <p className="mb-8 max-w-md font-body-md leading-relaxed text-[#524348]">
          You finished <span className="font-semibold text-[#1e1b18]">{title}</span>. Tell someone at
          home what you learned.
        </p>
        <Link
          href="/kid/library"
          className="inline-flex min-h-12 items-center rounded-xl bg-[#FF7956] px-8 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/25 hover:bg-[#ee6744]"
        >
          Back to library
        </Link>
        <StoryRecommendations currentStoryId={storyId} variant="light" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      {isImmersive && (
        <Link
          href={`/kid/story/${storyId}/immersive`}
          className="mb-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#520e33] font-label-sm tracking-widest text-[#ffdbd2] ring-1 ring-[#C4A574]/30 hover:bg-[#33001d]"
        >
          ✦ Enter immersive world
        </Link>
      )}

      <div className="mb-8 text-center">
        <p className="mb-1 font-label-sm uppercase tracking-[0.25em] text-[#857278]">{title}</p>
        <div className="mt-4 flex justify-center gap-2">
          {sentences.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-8 bg-[#FF7956]'
                  : i < index
                    ? 'w-2.5 bg-[#520e33]'
                    : 'w-2.5 bg-[#e9d7d0]'
              }`}
            />
          ))}
        </div>
        <p className="mt-3 font-label-sm uppercase tracking-widest text-[#857278]">
          {index + 1} of {total} · {progress}%
        </p>
      </div>

      <article className="relative overflow-hidden rounded-3xl border border-[#e9d7d0] bg-white p-8 shadow-xl shadow-[#520e33]/8 md:p-12">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ffdbd2]/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[#FF7956]/10 blur-2xl" />

        <div className="relative">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <ThemeBadge label={current?.theme_label} />
            {current?.audio_url && (
              <button
                type="button"
                onClick={playAudio}
                disabled={playing}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 font-label-sm tracking-widest transition ${
                  playing
                    ? 'bg-[#520e33] text-white'
                    : 'bg-[#ffdbd2] text-[#520e33] hover:bg-[#FF7956] hover:text-white'
                }`}
              >
                {playing ? '🔊 Playing…' : '▶ Hear it'}
              </button>
            )}
          </div>

          <p className="font-display-lg text-[1.75rem] leading-snug text-[#1e1b18] md:text-[2rem] md:leading-snug">
            {current?.sentence_text}
          </p>

          {current?.kinyarwanda_text && (
            <p className="mt-6 rounded-2xl border border-[#ffdbd2] bg-[#fff8f5] px-5 py-4 font-body-md text-lg italic leading-relaxed text-[#524348]">
              {current.kinyarwanda_text}
            </p>
          )}

          {current?.child_prompt && (
            <div className="mt-6 flex gap-3 rounded-2xl bg-[#520e33] p-4 text-white">
              <span className="text-2xl" aria-hidden>
                💭
              </span>
              <div>
                <p className="font-label-sm uppercase tracking-widest text-[#ffdbd2]">Wonder about</p>
                <p className="mt-1 font-body-md">{current.child_prompt}</p>
              </div>
            </div>
          )}
        </div>
      </article>

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
          disabled={index === 0}
          className="min-h-12 flex-1 rounded-xl border border-[#e9d7d0] bg-white font-label-md text-[#524348] disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          className="min-h-12 flex-[1.2] rounded-xl bg-[#520e33] font-label-md tracking-widest text-white shadow-lg shadow-[#520e33]/20 hover:bg-[#33001d]"
        >
          {index >= total - 1 ? 'Finish 🎉' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
