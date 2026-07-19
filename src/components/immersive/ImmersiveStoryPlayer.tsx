'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, MessageCircleQuestion, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import {
  preloadVoices,
  runTtsLipSync,
  speakNarration,
  unlockAudioPlayback,
  type TtsEngine,
} from '@/lib/aiVoice';
import { createAmbientSoundscape } from '@/lib/immersive/ambientSound';
import {
  buildMouthSyncTimings,
  estimateSyllableCount,
  getVisemeAtTime,
} from '@/lib/immersive/lipSync';
import { deriveSceneEventsFromSentences } from '@/lib/immersive/sceneEvents';
import { useActiveTimeOfDay, useActiveWeather, useImmersiveStore } from '@/lib/immersive/store';
import type {
  DisplayLanguage,
  EnvironmentType,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
} from '@/lib/immersive/types';
import type { KidSentence } from '@/components/story/KidStoryReader';
import AskQuestionSheet from '@/components/kid/AskQuestionSheet';
import StoryRecommendations from '@/components/story/StoryRecommendations';
import { resolveActiveCharacterIndex } from '@/lib/immersive/speaker';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

interface ImmersiveStoryPlayerProps {
  storyId: string;
  title: string;
  sentences: KidSentence[];
  environment: EnvironmentType;
  sceneSpec?: StorySceneSpec | null;
  sceneEvents?: Record<string, SceneEvent> | null;
  hotspots?: StoryHotspot[] | null;
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
  sceneEvents = null,
  hotspots = null,
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
  const ambientMuted = useImmersiveStore((s) => s.ambientMuted);
  const setAmbientMuted = useImmersiveStore((s) => s.setAmbientMuted);
  const weather = useActiveWeather();
  const timeOfDay = useActiveTimeOfDay();

  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  /** Mateza for Kinyarwanda by default; switch to browser to A/B accent. */
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>('mateza');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopTtsRef = useRef<(() => void) | null>(null);
  const stopLipSyncRef = useRef<(() => void) | null>(null);
  const advancingRef = useRef(false);
  const ttsActiveRef = useRef(false);
  const lipSyncTimingsRef = useRef<ReturnType<typeof buildMouthSyncTimings>>([]);
  const ambientRef = useRef<ReturnType<typeof createAmbientSoundscape> | null>(null);

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Grandmother', type: 'grandma' as const, position: 1 }];

  const resolvedSceneEvents = useMemo(() => {
    if (sceneEvents && Object.keys(sceneEvents).length > 0) return sceneEvents;
    return deriveSceneEventsFromSentences(sentences, environment);
  }, [environment, sceneEvents, sentences]);

  const current = sentences[sentenceIndex];
  const total = sentences.length;
  const hasKinyarwanda = sentences.some((s) => Boolean(s.kinyarwanda_text?.trim()));

  useEffect(() => {
    preloadVoices();
    init({
      storyId,
      environment,
      characters: slots,
      sceneSpec,
      sceneEvents: resolvedSceneEvents,
      hotspots,
      isImmersive: true,
      useAiVoice,
    });
    return () => {
      cleanupPlayback();
      ambientRef.current?.stop();
      ambientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, environment, sceneSpec, resolvedSceneEvents, hotspots, useAiVoice]);

  useEffect(() => {
    if (!started || completed) {
      ambientRef.current?.stop();
      ambientRef.current = null;
      return;
    }
    if (!ambientRef.current) {
      ambientRef.current = createAmbientSoundscape();
    }
    ambientRef.current.setEnvironment(environment);
    ambientRef.current.setWeather(weather);
    ambientRef.current.setTimeOfDay(timeOfDay);
    ambientRef.current.setMuted(ambientMuted);
  }, [ambientMuted, completed, environment, started, timeOfDay, weather]);

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

  const playTts = useCallback(async () => {
    const text = narrationText(displayLanguage);
    if (!text) return false;

    ttsActiveRef.current = true;
    setPlaying(true);
    stopLipSyncRef.current = runTtsLipSync(setMouthViseme, () => ttsActiveRef.current);

    const lang = displayLanguage === 'rw' ? 'rw-RW' : 'en-US';
    // Mateza is for Kinyarwanda; English always uses the browser voice.
    const engine: TtsEngine = displayLanguage === 'rw' ? ttsEngine : 'browser';

    stopTtsRef.current = await speakNarration(text, {
      engine,
      voice: 'grandma',
      lang,
      registerStop: (stop) => {
        stopTtsRef.current = stop;
      },
      onEnd: () => {
        ttsActiveRef.current = false;
        advanceSentence();
      },
      onStart: () => setPlaying(true),
    });
    return true;
  }, [
    advanceSentence,
    displayLanguage,
    narrationText,
    setMouthViseme,
    setPlaying,
    ttsEngine,
  ]);

  const playCurrentSentence = useCallback(async () => {
    if (!current) return;

    const wantsKinyarwanda = displayLanguage === 'rw' && Boolean(current.kinyarwanda_text?.trim());

    if (!wantsKinyarwanda && current.audio_url) {
      const ok = await playRecorded();
      if (!ok) await playTts();
      return;
    }

    if (await playTts()) return;

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

    const charIndex = resolveActiveCharacterIndex(current, slots, sentenceIndex);
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

  const openAskSheet = () => {
    cleanupPlayback();
    setAskOpen(true);
  };

  const closeAskSheet = () => {
    setAskOpen(false);
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
              <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
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
                {displayLanguage === 'rw' && (
                  <div className="flex rounded-full bg-[#241810]/90 p-0.5 ring-1 ring-[#C4A574]/35">
                    <button
                      type="button"
                      onClick={() => setTtsEngine('mateza')}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
                        ttsEngine === 'mateza'
                          ? 'bg-[#C4A574] text-[#1e1b18]'
                          : 'text-[#ffdbd2]/80 hover:text-[#ffdbd2]'
                      }`}
                      title="Natural Kinyarwanda via Mateza"
                    >
                      Mateza
                    </button>
                    <button
                      type="button"
                      onClick={() => setTtsEngine('browser')}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
                        ttsEngine === 'browser'
                          ? 'bg-[#C4A574] text-[#1e1b18]'
                          : 'text-[#ffdbd2]/80 hover:text-[#ffdbd2]'
                      }`}
                      title="Device speechSynthesis (weaker accent)"
                    >
                      Browser
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Ask a question"
                onClick={openAskSheet}
                className="flex h-8 items-center gap-1 rounded-lg border-2 border-[#FF7956]/60 bg-[#520e33]/90 px-2 text-[#ffdbd2] hover:border-[#FF7956]"
                title="Ask your family"
              >
                <MessageCircleQuestion size={16} strokeWidth={2.25} />
                <span
                  className="hidden text-[10px] uppercase tracking-wider sm:inline"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  Ask
                </span>
              </button>
              <button
                type="button"
                aria-label={ambientMuted ? 'Unmute ambience' : 'Mute ambience'}
                onClick={() => setAmbientMuted(!ambientMuted)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#C4A574]/40 bg-[#241810]/90 text-[#ffdbd2] hover:border-[#C4A574]"
              >
                {ambientMuted ? (
                  <VolumeX size={16} strokeWidth={2.25} />
                ) : (
                  <Volume2 size={16} strokeWidth={2.25} />
                )}
              </button>
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

      <AskQuestionSheet
        open={askOpen}
        storyId={storyId}
        sentenceId={current?.id}
        sentenceOrder={current?.sentence_order ?? sentenceIndex}
        sentencePreview={current?.sentence_text}
        onClose={closeAskSheet}
      />
    </div>
  );
}
