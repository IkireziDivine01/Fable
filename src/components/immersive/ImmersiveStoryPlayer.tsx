'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { preloadVoices, runTtsLipSync, speakText, unlockAudioPlayback } from '@/lib/aiVoice';
import {
  buildMouthSyncTimings,
  estimateSyllableCount,
  getVisemeAtTime,
} from '@/lib/immersive/lipSync';
import { useImmersiveStore } from '@/lib/immersive/store';
import type { DisplayLanguage, EnvironmentType, StoryCharacterSlot, StorySceneSpec } from '@/lib/immersive/types';
import type { KidSentence } from '@/components/story/KidStoryReader';
import StoryRecommendations from '@/components/story/StoryRecommendations';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

interface ImmersiveStoryPlayerProps {
  storyId: string;
  title: string;
  sentences: KidSentence[];
  environment: EnvironmentType;
  sceneSpec?: StorySceneSpec | null;
  characters: StoryCharacterSlot[];
  useAiVoice?: boolean;
  onComplete?: () => void;
}

export default function ImmersiveStoryPlayer({
  storyId,
  title,
  sentences,
  environment,
  sceneSpec = null,
  characters,
  useAiVoice = false,
  onComplete,
}: ImmersiveStoryPlayerProps) {
  const init = useImmersiveStore((s) => s.init);
  const sentenceIndex = useImmersiveStore((s) => s.sentenceIndex);
  const setSentenceIndex = useImmersiveStore((s) => s.setSentenceIndex);
  const setPlaying = useImmersiveStore((s) => s.setPlaying);
  const setMouthViseme = useImmersiveStore((s) => s.setMouthViseme);
  const setCurrentLine = useImmersiveStore((s) => s.setCurrentLine);
  const setActiveCharacterIndex = useImmersiveStore((s) => s.setActiveCharacterIndex);
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const setDisplayLanguage = useImmersiveStore((s) => s.setDisplayLanguage);
  const adjustCameraZoom = useImmersiveStore((s) => s.adjustCameraZoom);

  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopTtsRef = useRef<(() => void) | null>(null);
  const stopLipSyncRef = useRef<(() => void) | null>(null);
  const advancingRef = useRef(false);
  const ttsActiveRef = useRef(false);
  const lipSyncTimingsRef = useRef<ReturnType<typeof buildMouthSyncTimings>>([]);

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Grandmother', type: 'grandma' as const, position: 1 }];

  const current = sentences[sentenceIndex];
  const total = sentences.length;
  const hasKinyarwanda = sentences.some((s) => Boolean(s.kinyarwanda_text?.trim()));

  useEffect(() => {
    preloadVoices();
    init({ storyId, environment, characters: slots, sceneSpec, isImmersive: true, useAiVoice });
    return () => {
      cleanupPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, environment, sceneSpec, useAiVoice]);

  const cleanupPlayback = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    ttsActiveRef.current = false;
    stopTtsRef.current?.();
    stopTtsRef.current = null;
    stopLipSyncRef.current?.();
    stopLipSyncRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    lipSyncTimingsRef.current = [];
    setMouthViseme('X');
    setPlaying(false);
  }, [setMouthViseme, setPlaying]);

  const advanceSentence = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    cleanupPlayback();

    if (sentenceIndex >= total - 1) {
      setCompleted(true);
      onComplete?.();
      advancingRef.current = false;
      return;
    }

    setSentenceIndex(sentenceIndex + 1);
    setTimeout(() => {
      advancingRef.current = false;
    }, 300);
  }, [cleanupPlayback, onComplete, sentenceIndex, setSentenceIndex, total]);

  const tickRecordedLipSync = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) {
      setMouthViseme('X');
      return;
    }

    setMouthViseme(getVisemeAtTime(lipSyncTimingsRef.current, audio.currentTime));
    rafRef.current = requestAnimationFrame(tickRecordedLipSync);
  }, [setMouthViseme]);

  const playRecorded = useCallback(async () => {
    if (!current?.audio_url || !audioRef.current) return false;

    try {
      const audio = audioRef.current;
      audio.src = current.audio_url;

      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          audio.removeEventListener('loadedmetadata', onReady);
          audio.removeEventListener('error', onFail);
          resolve();
        };
        const onFail = () => {
          audio.removeEventListener('loadedmetadata', onReady);
          audio.removeEventListener('error', onFail);
          reject(new Error('Audio failed to load'));
        };
        if (audio.readyState >= 1) resolve();
        else {
          audio.addEventListener('loadedmetadata', onReady);
          audio.addEventListener('error', onFail);
        }
      });

      const duration = Number.isFinite(audio.duration) ? audio.duration : 4;
      lipSyncTimingsRef.current = buildMouthSyncTimings(
        duration,
        estimateSyllableCount(current.sentence_text)
      );

      audio.onended = () => {
        setMouthViseme('X');
        advanceSentence();
      };

      setPlaying(true);
      await audio.play();
      rafRef.current = requestAnimationFrame(tickRecordedLipSync);
      return true;
    } catch {
      cleanupPlayback();
      return false;
    }
  }, [
    advanceSentence,
    cleanupPlayback,
    current?.audio_url,
    current?.sentence_text,
    setMouthViseme,
    setPlaying,
    tickRecordedLipSync,
  ]);

  const narrationText = useCallback(
    (lang: DisplayLanguage) => {
      if (lang === 'rw' && current?.kinyarwanda_text?.trim()) {
        return current.kinyarwanda_text.trim();
      }
      return current?.sentence_text ?? '';
    },
    [current?.kinyarwanda_text, current?.sentence_text]
  );

  const playTts = useCallback(() => {
    const text = narrationText(displayLanguage);
    if (!text) return false;

    ttsActiveRef.current = true;
    setPlaying(true);
    stopLipSyncRef.current = runTtsLipSync(setMouthViseme, () => ttsActiveRef.current);
    stopTtsRef.current = speakText(text, {
      voice: 'grandma',
      lang: displayLanguage === 'rw' ? 'rw-RW' : 'en-US',
      onEnd: () => {
        ttsActiveRef.current = false;
        advanceSentence();
      },
      onStart: () => setPlaying(true),
    });
    return true;
  }, [advanceSentence, displayLanguage, narrationText, setMouthViseme, setPlaying]);

  const playCurrentSentence = useCallback(async () => {
    if (!current) return;

    const wantsKinyarwanda = displayLanguage === 'rw' && Boolean(current.kinyarwanda_text?.trim());

    if (!wantsKinyarwanda && current.audio_url) {
      const ok = await playRecorded();
      if (!ok) playTts();
      return;
    }

    if (playTts()) return;

    setPlaying(true);
    const text = narrationText(displayLanguage);
    const duration = Math.max(3500, (text.length || 20) * 55);
    setTimeout(advanceSentence, duration);
  }, [
    advanceSentence,
    current,
    displayLanguage,
    narrationText,
    playRecorded,
    playTts,
    setPlaying,
  ]);

  useEffect(() => {
    if (!started || !current || completed) return;

    const charIndex = sentenceIndex % slots.length;
    setActiveCharacterIndex(charIndex);
    setCurrentLine(current.sentence_text, current.kinyarwanda_text ?? undefined);

    let cancelled = false;

    const run = async () => {
      cleanupPlayback();
      if (cancelled) return;
      await playCurrentSentence();
    };

    run();
    return () => {
      cancelled = true;
      cleanupPlayback();
    };
  }, [
    cleanupPlayback,
    completed,
    current,
    playCurrentSentence,
    sentenceIndex,
    setActiveCharacterIndex,
    setCurrentLine,
    slots.length,
    started,
  ]);

  const handleStart = async () => {
    await unlockAudioPlayback();
    setStarted(true);
  };

  const handleLanguageChange = (lang: DisplayLanguage) => {
    setDisplayLanguage(lang);
  };

  if (completed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1e1b18] px-6 py-12 text-center">
        <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-[#C4A574]">Urakoze · Well done</p>
        <h1 className="mb-4 font-headline-lg text-headline-lg text-[#fff8f5]">{title}</h1>
        <p className="mb-8 max-w-sm font-body-md text-[#ffdbd2]/90">
          You travelled through the story. Share what you felt with your family.
        </p>
        <Link
          href="/kid/library"
          className="min-h-12 rounded-xl bg-[#FF7956] px-8 py-3 font-label-md tracking-widest text-white"
        >
          Return to library
        </Link>
        <StoryRecommendations currentStoryId={storyId} variant="dark" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
        <StoryCanvas />
        <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-[#1e1b18] via-[#1e1b18]/40 to-transparent px-6 pb-16 pt-32">
          <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-[#C4A574]">Inkuru</p>
          <h1 className="mb-6 max-w-lg text-center font-headline-md text-2xl text-[#fff8f5] md:text-3xl">
            {title}
          </h1>
          <button
            type="button"
            onClick={() => void handleStart()}
            className="min-h-14 rounded-xl bg-[#FF7956] px-10 font-label-md tracking-widest text-white shadow-lg shadow-[#FF7956]/30"
          >
            Enter the story
          </button>
          <Link
            href="/kid/library"
            className="mt-4 text-sm text-[#ffdbd2]/70 underline-offset-2 hover:underline"
          >
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
      <StoryCanvas />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#1e1b18]/90 to-transparent px-4 pb-8 pt-6">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/kid/library"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#C4A574]/50 bg-[#241810]/90 px-3 py-1.5 text-xs uppercase tracking-widest text-[#ffdbd2]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Library
            </Link>

            {hasKinyarwanda && (
              <div className="flex rounded-full bg-[#520e33]/80 p-0.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`rounded-full px-3 py-1 text-xs font-medium tracking-wide transition ${
                    displayLanguage === 'en'
                      ? 'bg-[#FF7956] text-white'
                      : 'text-[#ffdbd2]/80 hover:text-[#ffdbd2]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('rw')}
                  className={`rounded-full px-3 py-1 text-xs font-medium tracking-wide transition ${
                    displayLanguage === 'rw'
                      ? 'bg-[#FF7956] text-white'
                      : 'text-[#ffdbd2]/80 hover:text-[#ffdbd2]'
                  }`}
                >
                  Kinyarwanda
                </button>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => adjustCameraZoom(0.4)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#C4A574]/40 bg-[#241810]/90 text-[#ffdbd2] hover:border-[#C4A574]"
              >
                <ZoomOut size={16} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => adjustCameraZoom(-0.4)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#C4A574]/40 bg-[#241810]/90 text-[#ffdbd2] hover:border-[#C4A574]"
              >
                <ZoomIn size={16} strokeWidth={2.25} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {sentences.map((_, i) => (
              <span
                key={i}
                className={`transition-all ${
                  i === sentenceIndex
                    ? 'h-2.5 w-2.5 rotate-45 border-2 border-[#FF7956] bg-[#FF7956] shadow-[0_0_8px_rgba(255,121,86,0.6)]'
                    : i < sentenceIndex
                      ? 'h-2 w-2 rotate-45 border border-[#C4A574] bg-[#C4A574]'
                      : 'h-2 w-2 rotate-45 border border-[#524348] bg-transparent'
                }`}
              />
            ))}
            <span
              className="ml-2 text-xs tracking-widest text-[#C4A574]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {sentenceIndex + 1}/{total}
            </span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" preload="auto" />
    </div>
  );
}
