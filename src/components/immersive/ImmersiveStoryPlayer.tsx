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
  getPostStoryActivities,
  getPredictNextActivity,
} from '@/lib/immersive/engagementActivities';
import {
  buildMouthSyncTimings,
  estimateSyllableCount,
  getVisemeAtTime,
} from '@/lib/immersive/lipSync';
import { deriveSceneEventsFromSentences } from '@/lib/immersive/sceneEvents';
import { useActiveTimeOfDay, useActiveWeather, useImmersiveStore } from '@/lib/immersive/store';
import type {
  DisplayLanguage,
  EngagementActivity,
  EnvironmentType,
  SceneBrief,
  SceneEvent,
  SequenceActivity,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
  TreasureHuntActivity,
  VocabMatchActivity,
} from '@/lib/immersive/types';

type PostStoryActivity = TreasureHuntActivity | VocabMatchActivity | SequenceActivity;
import type { KidSentence } from '@/components/story/KidStoryReader';
import AskQuestionSheet from '@/components/kid/AskQuestionSheet';
import StoryRecommendations from '@/components/story/StoryRecommendations';
import { resolveActiveCharacterIndex } from '@/lib/immersive/speaker';
import {
  ActivityChooser,
  GameCompleteBurst,
  HuntClueStrip,
  PredictNextOverlay,
  SequenceOverlay,
  VocabPromptStrip,
} from './EngagementOverlays';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

export type ActivityLogEvent = 'ACTIVITY_STARTED' | 'ACTIVITY_COMPLETED';

interface ImmersiveStoryPlayerProps {
  storyId: string;
  title: string;
  sentences: KidSentence[];
  environment: EnvironmentType;
  sceneSpec?: StorySceneSpec | null;
  sceneBrief?: SceneBrief | null;
  sceneEvents?: Record<string, SceneEvent> | null;
  hotspots?: StoryHotspot[] | null;
  engagementActivities?: EngagementActivity[] | null;
  characters: StoryCharacterSlot[];
  useAiVoice?: boolean;
  /** Persist STORY_COMPLETED — should resolve true when saved. */
  onComplete?: () => void | Promise<boolean | void>;
  onActivityLog?: (
    eventType: ActivityLogEvent,
    metadata: Record<string, unknown>
  ) => void | Promise<void>;
}

type PackPhase =
  | { kind: 'idle' }
  | { kind: 'predict' }
  | { kind: 'choose' }
  | { kind: 'pack'; activity: PostStoryActivity }
  | { kind: 'celebrate'; message: string }
  | { kind: 'done' };

export default function ImmersiveStoryPlayer({
  storyId,
  title,
  sentences,
  environment,
  sceneSpec = null,
  sceneBrief = null,
  sceneEvents = null,
  hotspots = null,
  engagementActivities = null,
  characters,
  useAiVoice = false,
  onComplete,
  onActivityLog,
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
  const setEngagementMode = useImmersiveStore((s) => s.setEngagementMode);
  const setEngagementTargetPropTypes = useImmersiveStore(
    (s) => s.setEngagementTargetPropTypes
  );
  const setFoundPropTypes = useImmersiveStore((s) => s.setFoundPropTypes);
  const markPropFound = useImmersiveStore((s) => s.markPropFound);
  const setVocabExpectedPropType = useImmersiveStore((s) => s.setVocabExpectedPropType);
  const setWrongTapPropType = useImmersiveStore((s) => s.setWrongTapPropType);
  const setHintPropType = useImmersiveStore((s) => s.setHintPropType);
  const setActiveHotspot = useImmersiveStore((s) => s.setActiveHotspot);
  const setOnEngagementPropSelect = useImmersiveStore((s) => s.setOnEngagementPropSelect);
  const setSentenceCount = useImmersiveStore((s) => s.setSentenceCount);
  const setOnDialogueAdvance = useImmersiveStore((s) => s.setOnDialogueAdvance);
  const resetEngagement = useImmersiveStore((s) => s.resetEngagement);
  const weather = useActiveWeather();
  const timeOfDay = useActiveTimeOfDay();

  const [completed, setCompleted] = useState(false);
  const [completionSaved, setCompletionSaved] = useState<'pending' | 'saved' | 'failed'>(
    'pending'
  );
  const [started, setStarted] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>('mateza');
  const [phase, setPhase] = useState<PackPhase>({ kind: 'idle' });
  const [huntTargetIndex, setHuntTargetIndex] = useState(0);
  const [vocabPairIndex, setVocabPairIndex] = useState(0);
  const [predictResolved, setPredictResolved] = useState(false);
  const [missCount, setMissCount] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [softMiss, setSoftMiss] = useState<string | null>(null);
  const [busyTap, setBusyTap] = useState(false);
  const completionLoggedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopTtsRef = useRef<(() => void) | null>(null);
  const stopLipSyncRef = useRef<(() => void) | null>(null);
  const advancingRef = useRef(false);
  const ttsActiveRef = useRef(false);
  const lipSyncTimingsRef = useRef<ReturnType<typeof buildMouthSyncTimings>>([]);
  const ambientRef = useRef<ReturnType<typeof createAmbientSoundscape> | null>(null);
  const predictShownRef = useRef(false);

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Grandmother', type: 'grandma' as const, position: 1 }];

  const resolvedSceneEvents = useMemo(() => {
    if (sceneEvents && Object.keys(sceneEvents).length > 0) return sceneEvents;
    return deriveSceneEventsFromSentences(sentences, environment);
  }, [environment, sceneEvents, sentences]);

  const predictActivity = useMemo(
    () => getPredictNextActivity(engagementActivities),
    [engagementActivities]
  );
  /** Trim to short kid-friendly lengths so games stay snappy */
  const postActivities = useMemo((): PostStoryActivity[] => {
    return getPostStoryActivities(engagementActivities).map((activity) => {
      if (activity.type === 'treasure_hunt') {
        return { ...activity, targets: activity.targets.slice(0, 3) };
      }
      if (activity.type === 'vocab_match') {
        return { ...activity, pairs: activity.pairs.slice(0, 3) };
      }
      return activity;
    });
  }, [engagementActivities]);

  const current = sentences[sentenceIndex];
  const total = sentences.length;
  const hasKinyarwanda = sentences.some((s) => Boolean(s.kinyarwanda_text?.trim()));
  const keepScene =
    phase.kind === 'predict' ||
    phase.kind === 'choose' ||
    phase.kind === 'celebrate' ||
    (phase.kind === 'pack' &&
      (phase.activity.type === 'treasure_hunt' || phase.activity.type === 'vocab_match'));

  const logActivity = useCallback(
    (eventType: ActivityLogEvent, metadata: Record<string, unknown>) => {
      void onActivityLog?.(eventType, metadata);
    },
    [onActivityLog]
  );

  const beginPostPack = useCallback(() => {
    resetEngagement();
    setMissCount(0);
    setCelebration(null);
    setSoftMiss(null);
    setBusyTap(false);
    if (postActivities.length === 0) {
      setPhase({ kind: 'done' });
      return;
    }
    // One game only — kid picks (or auto-starts if just one)
    if (postActivities.length === 1) {
      setPhase({ kind: 'pack', activity: postActivities[0] });
      return;
    }
    setPhase({ kind: 'choose' });
  }, [postActivities, resetEngagement]);

  useEffect(() => {
    preloadVoices();
    init({
      storyId,
      environment,
      characters: slots,
      sceneSpec,
      sceneBrief,
      sceneEvents: resolvedSceneEvents,
      hotspots,
      isImmersive: true,
      useAiVoice,
    });
    setSentenceCount(sentences.length);
    return () => {
      cleanupPlayback();
      ambientRef.current?.stop();
      ambientRef.current = null;
      resetEngagement();
      setOnDialogueAdvance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, environment, sceneSpec, sceneBrief, resolvedSceneEvents, hotspots, useAiVoice]);

  useEffect(() => {
    setSentenceCount(sentences.length);
  }, [sentences.length, setSentenceCount]);

  useEffect(() => {
    const ambientOff = !started || (completed && !keepScene);
    if (ambientOff) {
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
  }, [ambientMuted, completed, environment, keepScene, started, timeOfDay, weather]);

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

  const persistCompletion = useCallback(async () => {
    if (completionLoggedRef.current) {
      setCompletionSaved('saved');
      return true;
    }
    setCompletionSaved('pending');
    try {
      const result = await onComplete?.();
      const ok = result !== false;
      if (ok) {
        completionLoggedRef.current = true;
        setCompletionSaved('saved');
        return true;
      }
      setCompletionSaved('failed');
      return false;
    } catch {
      setCompletionSaved('failed');
      return false;
    }
  }, [onComplete]);

  const finishStory = useCallback(() => {
    setCompleted(true);
    void persistCompletion().finally(() => {
      beginPostPack();
    });
  }, [beginPostPack, persistCompletion]);

  const skipToDone = useCallback(() => {
    resetEngagement();
    setPhase({ kind: 'done' });
    void persistCompletion();
  }, [persistCompletion, resetEngagement]);

  const advanceSentence = useCallback(() => {
    if (advancingRef.current || phase.kind === 'predict') return;
    advancingRef.current = true;
    cleanupPlayback();

    // About to leave penultimate sentence → interrupt with predict_next
    if (
      !predictResolved &&
      predictActivity &&
      !predictShownRef.current &&
      sentenceIndex === total - 2 &&
      total >= 4
    ) {
      predictShownRef.current = true;
      setPhase({ kind: 'predict' });
      logActivity('ACTIVITY_STARTED', { activityType: 'predict_next' });
      advancingRef.current = false;
      return;
    }

    if (sentenceIndex >= total - 1) {
      finishStory();
      advancingRef.current = false;
      return;
    }

    setSentenceIndex(sentenceIndex + 1);
    setTimeout(() => {
      advancingRef.current = false;
    }, 300);
  }, [
    cleanupPlayback,
    finishStory,
    logActivity,
    phase.kind,
    predictActivity,
    predictResolved,
    sentenceIndex,
    setSentenceIndex,
    total,
  ]);

  useEffect(() => {
    if (completed || !started) {
      setOnDialogueAdvance(null);
      return;
    }
    setOnDialogueAdvance(advanceSentence);
    return () => setOnDialogueAdvance(null);
  }, [advanceSentence, completed, setOnDialogueAdvance, started]);

  const handlePredictAnswer = useCallback(
    (choiceId: string, correct: boolean) => {
      logActivity('ACTIVITY_COMPLETED', {
        activityType: 'predict_next',
        correct,
        choiceId,
      });
      setPredictResolved(true);
      setPhase({ kind: 'idle' });
      setSentenceIndex(total - 1);
      advancingRef.current = false;
    },
    [logActivity, setSentenceIndex, total]
  );

  const finishGame = useCallback(
    (message: string) => {
      resetEngagement();
      setHuntTargetIndex(0);
      setVocabPairIndex(0);
      setMissCount(0);
      setCelebration(null);
      setSoftMiss(null);
      setBusyTap(false);
      setPhase({ kind: 'celebrate', message });
    },
    [resetEngagement]
  );

  const currentPackActivity = phase.kind === 'pack' ? phase.activity : undefined;

  // Start hunt / vocab when pack activity changes
  useEffect(() => {
    if (phase.kind !== 'pack' || !currentPackActivity) return;

    setMissCount(0);
    setCelebration(null);
    setSoftMiss(null);
    setBusyTap(false);
    setHintPropType(null);
    setActiveHotspot(null);

    if (currentPackActivity.type === 'treasure_hunt') {
      const hunt = currentPackActivity;
      setHuntTargetIndex(0);
      setFoundPropTypes([]);
      setEngagementMode('hunt');
      // Only the CURRENT treasure is tappable — avoids "wrong" on future finds
      setEngagementTargetPropTypes(
        hunt.targets[0] ? [hunt.targets[0].propType] : []
      );
      logActivity('ACTIVITY_STARTED', { activityType: 'treasure_hunt' });
    } else if (currentPackActivity.type === 'vocab_match') {
      const vocab = currentPackActivity;
      setVocabPairIndex(0);
      setFoundPropTypes([]);
      setEngagementMode('vocab');
      setEngagementTargetPropTypes(vocab.pairs.map((p) => p.propType));
      setVocabExpectedPropType(vocab.pairs[0]?.propType ?? null);
      logActivity('ACTIVITY_STARTED', { activityType: 'vocab_match' });
    } else if (currentPackActivity.type === 'sequence') {
      setEngagementMode('off');
      setEngagementTargetPropTypes([]);
      logActivity('ACTIVITY_STARTED', { activityType: 'sequence' });
    }
  }, [
    currentPackActivity,
    logActivity,
    phase.kind,
    setActiveHotspot,
    setEngagementMode,
    setEngagementTargetPropTypes,
    setFoundPropTypes,
    setHintPropType,
    setVocabExpectedPropType,
  ]);

  const flashHint = useCallback(
    (propType: string) => {
      setHintPropType(propType);
      window.setTimeout(() => setHintPropType(null), 2200);
    },
    [setHintPropType]
  );

  const handleHuntOrVocabTap = useCallback(
    (propType: string) => {
      if (phase.kind !== 'pack' || !currentPackActivity || busyTap) return;

      if (currentPackActivity.type === 'treasure_hunt') {
        const hunt = currentPackActivity;
        const target = hunt.targets[huntTargetIndex];
        if (!target) return;

        if (propType !== target.propType) {
          setMissCount((n) => n + 1);
          setWrongTapPropType(propType);
          setSoftMiss('Not that one — follow the clue!');
          window.setTimeout(() => {
            setWrongTapPropType(null);
            setSoftMiss(null);
          }, 900);
          return;
        }

        setBusyTap(true);
        setMissCount(0);
        setHintPropType(null);
        markPropFound(propType);
        const nextIndex = huntTargetIndex + 1;
        const foundAll = nextIndex >= hunt.targets.length;
        setCelebration(foundAll ? 'You found every treasure!' : 'Found it! ★');

        window.setTimeout(() => {
          setCelebration(null);
          if (foundAll) {
            logActivity('ACTIVITY_COMPLETED', {
              activityType: 'treasure_hunt',
              score: hunt.targets.length,
              total: hunt.targets.length,
              correct: true,
            });
            finishGame('Treasure hunt complete!');
          } else {
            setHuntTargetIndex(nextIndex);
            setEngagementTargetPropTypes([hunt.targets[nextIndex].propType]);
            setBusyTap(false);
          }
        }, 1000);
        return;
      }

      if (currentPackActivity.type === 'vocab_match') {
        const vocab = currentPackActivity;
        const pair = vocab.pairs[vocabPairIndex];
        if (!pair) return;

        if (propType !== pair.propType) {
          setMissCount((n) => n + 1);
          setWrongTapPropType(propType);
          setSoftMiss(`Hmm… not that. Look for “${pair.glossEn}”`);
          window.setTimeout(() => {
            setWrongTapPropType(null);
            setSoftMiss(null);
          }, 1000);
          return;
        }

        setBusyTap(true);
        setMissCount(0);
        setHintPropType(null);
        markPropFound(propType);
        const nextIndex = vocabPairIndex + 1;
        const done = nextIndex >= vocab.pairs.length;
        setCelebration(done ? 'Word master!' : `${pair.wordRw} — yes!`);

        window.setTimeout(() => {
          setCelebration(null);
          if (done) {
            logActivity('ACTIVITY_COMPLETED', {
              activityType: 'vocab_match',
              score: vocab.pairs.length,
              total: vocab.pairs.length,
              correct: true,
            });
            finishGame('Word match complete!');
          } else {
            setVocabPairIndex(nextIndex);
            setVocabExpectedPropType(vocab.pairs[nextIndex]?.propType ?? null);
            setBusyTap(false);
          }
        }, 900);
      }
    },
    [
      busyTap,
      currentPackActivity,
      finishGame,
      huntTargetIndex,
      logActivity,
      markPropFound,
      phase.kind,
      setEngagementTargetPropTypes,
      setHintPropType,
      setVocabExpectedPropType,
      setWrongTapPropType,
      vocabPairIndex,
    ]
  );

  useEffect(() => {
    setOnEngagementPropSelect(handleHuntOrVocabTap);
    return () => setOnEngagementPropSelect(null);
  }, [handleHuntOrVocabTap, setOnEngagementPropSelect]);

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

  const playCurrentSentenceRef = useRef(playCurrentSentence);
  playCurrentSentenceRef.current = playCurrentSentence;

  useEffect(() => {
    if (!started || !current || completed || phase.kind === 'predict') return;

    const charIndex = resolveActiveCharacterIndex(current, slots, sentenceIndex);
    setActiveCharacterIndex(charIndex);
    setCurrentLine(current.sentence_text, current.kinyarwanda_text ?? undefined);

    let cancelled = false;

    const run = async () => {
      cleanupPlayback();
      if (cancelled) return;
      // Use a ref so unstable callback identity does not abort in-flight Mateza audio.
      await playCurrentSentenceRef.current();
    };

    run();
    return () => {
      cancelled = true;
      cleanupPlayback();
    };
    // Restart only when the spoken line / voice engine actually changes.
  }, [
    cleanupPlayback,
    completed,
    current?.id,
    current?.kinyarwanda_text,
    current?.sentence_text,
    displayLanguage,
    phase.kind,
    sentenceIndex,
    setActiveCharacterIndex,
    setCurrentLine,
    slots.length,
    started,
    ttsEngine,
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

  // Final done screen (no more activities)
  if (completed && phase.kind === 'done') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1e1b18] px-6 py-12 text-center">
        <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-[#C4A574]">
          Urakoze · Well done
        </p>
        <h1 className="mb-4 font-headline-lg text-headline-lg text-[#fff8f5]">{title}</h1>
        <p className="mb-3 max-w-sm font-body-md text-[#ffdbd2]/90">
          You travelled through the story. Share what you felt with your family.
        </p>
        <p
          className={`mb-8 max-w-md font-body-sm text-sm ${
            completionSaved === 'saved'
              ? 'text-[#5a8f6a]'
              : completionSaved === 'failed'
                ? 'text-[#FF7956]'
                : 'text-[#C4A574]'
          }`}
        >
          {completionSaved === 'saved'
            ? 'Saved on your shelf as finished'
            : completionSaved === 'failed'
              ? 'Could not save yet — ask a parent to run the database fix, then tap retry'
              : 'Saving to your shelf…'}
        </p>
        <div className="flex flex-col items-center gap-3">
          {completionSaved === 'failed' && (
            <button
              type="button"
              onClick={() => void persistCompletion()}
              className="min-h-12 rounded-xl border border-[#FF7956] px-8 py-3 font-label-md tracking-widest text-[#FF7956]"
            >
              Retry save
            </button>
          )}
          <Link
            href="/kid/library"
            className="min-h-12 rounded-xl bg-[#FF7956] px-8 py-3 font-label-md tracking-widest text-white"
          >
            See my finished stories
          </Link>
        </div>
        <StoryRecommendations currentStoryId={storyId} variant="dark" />
      </div>
    );
  }

  // Sequence game (fullscreen overlay)
  if (completed && phase.kind === 'pack' && currentPackActivity?.type === 'sequence') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
        <button
          type="button"
          onClick={skipToDone}
          className="absolute right-4 top-4 z-50 min-h-10 rounded-xl bg-[#520e33]/90 px-4 font-label-sm tracking-widest text-[#ffdbd2] ring-1 ring-[#C4A574]/40"
        >
          Maybe later
        </button>
        <SequenceOverlay
          activity={currentPackActivity}
          onComplete={(correct, score) => {
            logActivity('ACTIVITY_COMPLETED', {
              activityType: 'sequence',
              correct,
              score,
              total: currentPackActivity.beats.length,
            });
            finishGame(
              correct ? 'Perfect story order!' : `${score} in the right place — great listening!`
            );
          }}
        />
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

  const showHud = !completed && phase.kind !== 'predict';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
      <StoryCanvas />

      {completed && (phase.kind === 'pack' || phase.kind === 'choose') && (
        <button
          type="button"
          onClick={skipToDone}
          className="absolute right-4 top-4 z-40 min-h-10 rounded-xl bg-[#520e33]/95 px-4 font-label-sm tracking-widest text-[#ffdbd2] shadow-lg ring-1 ring-[#C4A574]/50"
        >
          Maybe later
        </button>
      )}

      {phase.kind === 'choose' && (
        <ActivityChooser
          activities={postActivities}
          onPick={(index) => {
            const activity = postActivities[index];
            if (activity) setPhase({ kind: 'pack', activity });
          }}
          onSkip={skipToDone}
        />
      )}

      {phase.kind === 'celebrate' && (
        <GameCompleteBurst
          title={phase.message}
          onDone={() => setPhase({ kind: 'done' })}
        />
      )}

      {showHud && (
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
      )}

      {phase.kind === 'predict' && predictActivity && (
        <PredictNextOverlay activity={predictActivity} onAnswer={handlePredictAnswer} />
      )}

      {phase.kind === 'pack' && currentPackActivity?.type === 'treasure_hunt' && (
        <HuntClueStrip
          activity={currentPackActivity}
          targetIndex={huntTargetIndex}
          missCount={missCount}
          celebration={celebration}
          softMiss={softMiss}
          onHint={() => {
            const target = currentPackActivity.targets[huntTargetIndex];
            if (target) flashHint(target.propType);
          }}
        />
      )}

      {phase.kind === 'pack' &&
        currentPackActivity?.type === 'vocab_match' &&
        currentPackActivity.pairs[vocabPairIndex] && (
          <VocabPromptStrip
            activity={currentPackActivity}
            pair={currentPackActivity.pairs[vocabPairIndex]}
            pairIndex={vocabPairIndex}
            missCount={missCount}
            celebration={celebration}
            softMiss={softMiss}
            onHint={() => {
              const pair = currentPackActivity.pairs[vocabPairIndex];
              if (pair) flashHint(pair.propType);
            }}
          />
        )}


      <audio ref={audioRef} className="hidden" preload="auto" />

      {!completed && (
        <AskQuestionSheet
          open={askOpen}
          storyId={storyId}
          sentenceId={current?.id}
          sentenceOrder={current?.sentence_order ?? sentenceIndex}
          sentencePreview={current?.sentence_text}
          onClose={closeAskSheet}
        />
      )}
    </div>
  );
}
