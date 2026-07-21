'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, MessageCircleQuestion, Pause, Play, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import {
  runTtsLipSync,
  speakNarration,
  ttsProviderForLang,
  unlockAudioPlayback,
} from '@/lib/aiVoice';
import { createAmbientSoundscape } from '@/lib/immersive/ambientSound';
import {
  ensureEngagementActivities,
  getPostStoryActivities,
  getPredictNextActivity,
} from '@/lib/immersive/engagementActivities';
import {
  buildMouthSyncTimings,
  estimateSyllableCount,
  getVisemeAtTime,
} from '@/lib/immersive/lipSync';
import { deriveSceneEventsFromSentences } from '@/lib/immersive/sceneEvents';
import {
  CAMERA_ZOOM_DEFAULT,
  useActiveTimeOfDay,
  useActiveWeather,
  useImmersiveStore,
} from '@/lib/immersive/store';
import type {
  DisplayLanguage,
  EngagementActivity,
  EnvironmentType,
  SceneBrief,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
  VocabMatchActivity,
} from '@/lib/immersive/types';

type PostStoryActivity = VocabMatchActivity;
import type { KidSentence } from '@/components/story/KidStoryReader';
import AskQuestionSheet from '@/components/kid/AskQuestionSheet';
import StoryRecommendations from '@/components/story/StoryRecommendations';
import KezaMascot from '@/components/immersive/KezaMascot';
import { resolveActiveCharacterIndex } from '@/lib/immersive/speaker';
import { GameCompleteBurst, PredictNextOverlay } from './EngagementOverlays';
import WordBuildOverlay from './WordBuildOverlay';

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
  const setCameraZoom = useImmersiveStore((s) => s.setCameraZoom);
  const ambientMuted = useImmersiveStore((s) => s.ambientMuted);
  const setAmbientMuted = useImmersiveStore((s) => s.setAmbientMuted);
  const setSceneChromeHidden = useImmersiveStore((s) => s.setSceneChromeHidden);
  const setEngagementMode = useImmersiveStore((s) => s.setEngagementMode);
  const setEngagementTargetPropTypes = useImmersiveStore(
    (s) => s.setEngagementTargetPropTypes
  );
  const setFoundPropTypes = useImmersiveStore((s) => s.setFoundPropTypes);
  const setVocabExpectedPropType = useImmersiveStore((s) => s.setVocabExpectedPropType);
  const setHintPropType = useImmersiveStore((s) => s.setHintPropType);
  const setActiveHotspot = useImmersiveStore((s) => s.setActiveHotspot);
  const setActiveWordSpark = useImmersiveStore((s) => s.setActiveWordSpark);
  const setOnWordSparkOpen = useImmersiveStore((s) => s.setOnWordSparkOpen);
  const setOnWordSparkClose = useImmersiveStore((s) => s.setOnWordSparkClose);
  const setWordSparkVocabHints = useImmersiveStore((s) => s.setWordSparkVocabHints);
  const setOnEngagementPropSelect = useImmersiveStore((s) => s.setOnEngagementPropSelect);
  const setSentenceCount = useImmersiveStore((s) => s.setSentenceCount);
  const setOnDialogueAdvance = useImmersiveStore((s) => s.setOnDialogueAdvance);
  const setOnPlaybackPauseToggle = useImmersiveStore((s) => s.setOnPlaybackPauseToggle);
  const setUserPaused = useImmersiveStore((s) => s.setUserPaused);
  const userPaused = useImmersiveStore((s) => s.userPaused);
  const resetEngagement = useImmersiveStore((s) => s.resetEngagement);
  const weather = useActiveWeather();
  const timeOfDay = useActiveTimeOfDay();

  const [completed, setCompleted] = useState(false);
  const [completionSaved, setCompletionSaved] = useState<'pending' | 'saved' | 'failed'>(
    'pending'
  );
  const [started, setStarted] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [phase, setPhase] = useState<PackPhase>({ kind: 'idle' });
  const [predictResolved, setPredictResolved] = useState(false);
  /** Session cache for on-demand Kinyarwanda when sentences lack kinyarwanda_text */
  const [rwOverrides, setRwOverrides] = useState<Record<string, string>>({});
  const [rwTranslating, setRwTranslating] = useState(false);
  /** Session-local WordSpark count for done-screen recap */
  const [wordsSparked, setWordsSparked] = useState(0);
  const [lastGameMessage, setLastGameMessage] = useState<string | null>(null);
  const completionLoggedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopTtsRef = useRef<(() => void) | null>(null);
  const ttsPauseResumeRef = useRef<{
    pause: () => void;
    resume: () => Promise<void>;
  } | null>(null);
  const stopLipSyncRef = useRef<(() => void) | null>(null);
  const advancingRef = useRef(false);
  const ttsActiveRef = useRef(false);
  const userPausedRef = useRef(false);
  const pausedByKezaRef = useRef(false);
  const lipSyncTimingsRef = useRef<ReturnType<typeof buildMouthSyncTimings>>([]);
  const ambientRef = useRef<ReturnType<typeof createAmbientSoundscape> | null>(null);
  const predictShownRef = useRef(false);
  /** Blocks story TTS auto-advance while Keza's predict overlay owns audio */
  const storyAdvanceBlockedRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const isPredictPhase = (): boolean => phaseRef.current.kind === 'predict';

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Grandmother', type: 'grandma' as const, position: 1 }];

  const resolvedSceneEvents = useMemo(() => {
    if (sceneEvents && Object.keys(sceneEvents).length > 0) return sceneEvents;
    return deriveSceneEventsFromSentences(sentences, environment);
  }, [environment, sceneEvents, sentences]);

  /** Legacy stories without stored packs still get predict + post games */
  const resolvedActivities = useMemo(
    () =>
      ensureEngagementActivities(engagementActivities, {
        sceneBrief,
        sceneSpec,
        environment,
        sentences,
      }) ?? null,
    [engagementActivities, environment, sceneBrief, sceneSpec, sentences]
  );

  const predictActivity = useMemo(
    () => getPredictNextActivity(resolvedActivities),
    [resolvedActivities]
  );
  /** Letter Party — post-story word build from vocab / hunt synthesis */
  const postActivities = useMemo((): PostStoryActivity[] => {
    return getPostStoryActivities(resolvedActivities, {
      sceneBrief,
      sceneSpec,
      environment,
      sentences,
    }).map((activity) => ({
      ...activity,
      pairs: activity.pairs.slice(0, 4),
    }));
  }, [environment, resolvedActivities, sceneBrief, sceneSpec, sentences]);

  const vocabHints = useMemo(
    () => postActivities.flatMap((activity) => activity.pairs),
    [postActivities]
  );

  useEffect(() => {
    setWordSparkVocabHints(vocabHints);
  }, [setWordSparkVocabHints, vocabHints]);

  const current = sentences[sentenceIndex];
  const total = sentences.length;

  const resolveRwText = useCallback(
    (sentence: KidSentence | undefined) => {
      if (!sentence) return '';
      const saved =
        sentence.kinyarwanda_text ??
        (sentence as { kinyarwandaText?: string | null }).kinyarwandaText ??
        '';
      if (saved.trim()) return saved.trim();
      return (rwOverrides[sentence.id] ?? '').trim();
    },
    [rwOverrides]
  );

  // Always offer EN/RW — narration falls back to English when a line has no RW text.
  const keepScene = phase.kind === 'predict' || phase.kind === 'celebrate';

  const logActivity = useCallback(
    (eventType: ActivityLogEvent, metadata: Record<string, unknown>) => {
      void onActivityLog?.(eventType, metadata);
    },
    [onActivityLog]
  );

  const beginPostPack = useCallback(() => {
    resetEngagement();
    if (postActivities.length === 0) {
      setPhase({ kind: 'done' });
      return;
    }
    setPhase({ kind: 'pack', activity: postActivities[0] });
  }, [postActivities, resetEngagement]);

  useEffect(() => {
    // Fresh entry into a story always starts at line 1 (Continue / Read again).
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
    setSentenceIndex(0);
    setCurrentLine('', '');
    setSentenceCount(sentences.length);
    if (typeof window !== 'undefined') {
      try {
        const saved = window.sessionStorage.getItem(`fable:lang:${storyId}`);
        if (saved === 'en' || saved === 'rw') {
          setDisplayLanguage(saved);
        }
      } catch {
        /* ignore */
      }
    }
    return () => {
      cleanupPlayback();
      ambientRef.current?.stop();
      ambientRef.current = null;
      resetEngagement();
      setOnDialogueAdvance(null);
      setOnPlaybackPauseToggle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // World/scene updates for the active story — do not wipe dialogue or sentence progress.
  useEffect(() => {
    if (!storyId) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment, sceneSpec, sceneBrief, resolvedSceneEvents, hotspots, useAiVoice]);

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
    ttsPauseResumeRef.current = null;
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
    userPausedRef.current = false;
    setUserPaused(false);
  }, [setMouthViseme, setPlaying, setUserPaused]);

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
    setCameraZoom(CAMERA_ZOOM_DEFAULT);
    setPhase({ kind: 'done' });
    void persistCompletion();
  }, [persistCompletion, resetEngagement, setCameraZoom]);

  const advanceSentence = useCallback(() => {
    if (advancingRef.current || phase.kind === 'predict') return;
    if (storyAdvanceBlockedRef.current) return;
    advancingRef.current = true;

    // About to leave penultimate sentence → interrupt with predict_next
    if (
      !predictResolved &&
      predictActivity &&
      !predictShownRef.current &&
      sentenceIndex === total - 2 &&
      total >= 4
    ) {
      // Stop story narration first; ignore its onEnd so it cannot start the finale under Keza
      storyAdvanceBlockedRef.current = true;
      predictShownRef.current = true;
      cleanupPlayback();
      setPhase({ kind: 'predict' });
      logActivity('ACTIVITY_STARTED', { activityType: 'predict_next' });
      advancingRef.current = false;
      return;
    }

    cleanupPlayback();

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

  useEffect(() => {
    if (completed || !started) {
      setOnWordSparkOpen(null);
      setOnWordSparkClose(null);
      return;
    }
    const open = () => {
      cleanupPlayback();
      // Pause the story while Keza’s card is open
      userPausedRef.current = true;
      pausedByKezaRef.current = true;
      setUserPaused(true);
      setActiveHotspot(null);
      setWordsSparked((count) => count + 1);
    };
    const close = () => {
      if (!pausedByKezaRef.current) return;
      pausedByKezaRef.current = false;
      userPausedRef.current = false;
      setUserPaused(false);
      void (async () => {
        await unlockAudioPlayback();
        // Kid may have paused again; don't force play
        if (userPausedRef.current) return;
        await playCurrentSentenceRef.current();
      })();
    };
    setOnWordSparkOpen(open);
    setOnWordSparkClose(close);
    return () => {
      setOnWordSparkOpen(null);
      setOnWordSparkClose(null);
    };
  }, [
    cleanupPlayback,
    completed,
    setActiveHotspot,
    setOnWordSparkClose,
    setOnWordSparkOpen,
    setUserPaused,
    started,
  ]);

  const handlePredictAnswer = useCallback(
    (choiceId: string, correct: boolean) => {
      logActivity('ACTIVITY_COMPLETED', {
        activityType: 'predict_next',
        correct,
        choiceId,
      });
      storyAdvanceBlockedRef.current = false;
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
      setCameraZoom(CAMERA_ZOOM_DEFAULT);
      setLastGameMessage(message);
      setPhase({ kind: 'celebrate', message });
    },
    [resetEngagement, setCameraZoom]
  );

  const currentPackActivity = phase.kind === 'pack' ? phase.activity : undefined;

  // Letter Party — UI-only; turn off 3D engagement
  useEffect(() => {
    if (phase.kind !== 'pack' || !currentPackActivity) return;
    setEngagementMode('off');
    setEngagementTargetPropTypes([]);
    setVocabExpectedPropType(null);
    setHintPropType(null);
    setActiveHotspot(null);
    setFoundPropTypes([]);
    logActivity('ACTIVITY_STARTED', { activityType: 'word_build' });
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

  useEffect(() => {
    setOnEngagementPropSelect(null);
    return () => setOnEngagementPropSelect(null);
  }, [setOnEngagementPropSelect]);

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
        if (userPausedRef.current) return;
        if (storyAdvanceBlockedRef.current) return;
        if (isPredictPhase()) return;
        if (useImmersiveStore.getState().activeWordSpark) return;
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

  // Fill missing Kinyarwanda when the kid switches language (older stories often lack it).
  useEffect(() => {
    if (displayLanguage !== 'rw' || sentences.length === 0) return;

    const missing = sentences.filter((s) => {
      const saved = (s.kinyarwanda_text ?? '').trim();
      return !saved && !rwOverrides[s.id]?.trim() && Boolean(s.sentence_text?.trim());
    });
    if (missing.length === 0) return;

    let cancelled = false;
    setRwTranslating(true);

    void (async () => {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: missing.map((s) => s.sentence_text),
            target: 'rw',
          }),
        });
        const data = (await res.json()) as { translations?: string[]; error?: string };
        if (!res.ok || cancelled) return;
        const translations = data.translations ?? [];
        setRwOverrides((prev) => {
          const next = { ...prev };
          missing.forEach((s, i) => {
            const rw = translations[i]?.trim();
            if (rw) next[s.id] = rw;
          });
          return next;
        });
      } catch (err) {
        console.warn('Kinyarwanda translation failed:', err);
      } finally {
        if (!cancelled) setRwTranslating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when language flips or the sentence set changes — not on every override write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayLanguage, sentences]);

  const narrationText = useCallback(
    (lang: DisplayLanguage) => {
      if (lang === 'rw') {
        const rw = resolveRwText(current);
        if (rw) return rw;
      }
      return current?.sentence_text ?? '';
    },
    [current, resolveRwText]
  );

  const playTts = useCallback(async () => {
    if (storyAdvanceBlockedRef.current || isPredictPhase()) return false;
    const text = narrationText(displayLanguage);
    if (!text) return false;

    ttsActiveRef.current = true;
    setPlaying(true);
    stopLipSyncRef.current = runTtsLipSync(setMouthViseme, () => ttsActiveRef.current);

    const lang = displayLanguage === 'rw' ? 'rw-RW' : 'en-US';
    // ElevenLabs for English; Proto for Kinyarwanda.
    const engine = ttsProviderForLang(lang);

    const speakerIndex = resolveActiveCharacterIndex(current, slots, sentenceIndex);
    const speaker = slots[speakerIndex] ?? slots[0];

    if (storyAdvanceBlockedRef.current || isPredictPhase()) {
      ttsActiveRef.current = false;
      stopLipSyncRef.current?.();
      stopLipSyncRef.current = null;
      setPlaying(false);
      return false;
    }

    stopTtsRef.current = await speakNarration(text, {
      engine,
      characterType: speaker?.type ?? 'grandma',
      personalityPose: speaker?.appearance?.personalityPose,
      lang,
      registerStop: (stop) => {
        stopTtsRef.current = stop;
      },
      registerPlaybackControls: (controls) => {
        stopTtsRef.current = controls.stop;
        ttsPauseResumeRef.current = {
          pause: controls.pause,
          resume: controls.resume,
        };
      },
      onEnd: () => {
        ttsActiveRef.current = false;
        ttsPauseResumeRef.current = null;
        if (userPausedRef.current) return;
        if (storyAdvanceBlockedRef.current) return;
        if (isPredictPhase()) return;
        if (useImmersiveStore.getState().activeWordSpark) return;
        advanceSentence();
      },
      onStart: () => {
        if (storyAdvanceBlockedRef.current || isPredictPhase()) return;
        setPlaying(true);
      },
    });

    if (storyAdvanceBlockedRef.current || isPredictPhase()) {
      stopTtsRef.current?.();
      stopTtsRef.current = null;
      ttsPauseResumeRef.current = null;
      ttsActiveRef.current = false;
      stopLipSyncRef.current?.();
      stopLipSyncRef.current = null;
      setPlaying(false);
      return false;
    }

    return true;
  }, [
    advanceSentence,
    current,
    displayLanguage,
    narrationText,
    sentenceIndex,
    setMouthViseme,
    setPlaying,
    slots,
  ]);

  const playCurrentSentence = useCallback(async () => {
    if (!current) return;
    if (storyAdvanceBlockedRef.current || isPredictPhase()) return;

    const wantsKinyarwanda =
      displayLanguage === 'rw' && Boolean(resolveRwText(current));

    if (!wantsKinyarwanda && current.audio_url) {
      const ok = await playRecorded();
      if (!ok) await playTts();
      return;
    }

    if (await playTts()) return;

    setPlaying(true);
    const text = narrationText(displayLanguage);
    const duration = Math.max(3500, (text.length || 20) * 55);
    setTimeout(() => {
      if (userPausedRef.current) return;
      if (storyAdvanceBlockedRef.current) return;
      if (isPredictPhase()) return;
      if (useImmersiveStore.getState().activeWordSpark) return;
      advanceSentence();
    }, duration);
  }, [
    advanceSentence,
    current,
    displayLanguage,
    narrationText,
    playRecorded,
    playTts,
    resolveRwText,
    setPlaying,
  ]);

  const playCurrentSentenceRef = useRef(playCurrentSentence);
  playCurrentSentenceRef.current = playCurrentSentence;

  // Keep dialogue text in the store whenever the active sentence changes.
  // Separate from audio so init/re-render races cannot blank the HUD.
  useEffect(() => {
    if (!started || !current || completed) return;
    const en = current.sentence_text ?? '';
    const rw = resolveRwText(current);
    setCurrentLine(en, rw || undefined);
    const charIndex = resolveActiveCharacterIndex(current, slots, sentenceIndex);
    setActiveCharacterIndex(charIndex);
  }, [
    completed,
    current,
    resolveRwText,
    sentenceIndex,
    setActiveCharacterIndex,
    setCurrentLine,
    slots,
    started,
  ]);

  useEffect(() => {
    if (!started || !current || completed || phase.kind === 'predict') return;
    if (userPausedRef.current) return;
    if (useImmersiveStore.getState().activeWordSpark) return;
    // Wait for on-demand RW translation before speaking in Kinyarwanda
    if (
      displayLanguage === 'rw' &&
      rwTranslating &&
      !resolveRwText(current)
    ) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      cleanupPlayback();
      if (cancelled || userPausedRef.current) return;
      if (useImmersiveStore.getState().activeWordSpark) return;
      await playCurrentSentenceRef.current();
    };

    run();
    return () => {
      cancelled = true;
      cleanupPlayback();
    };
  }, [
    cleanupPlayback,
    completed,
    current?.id,
    displayLanguage,
    phase.kind,
    resolveRwText,
    rwTranslating,
    sentenceIndex,
    started,
  ]);

  const handleStart = async () => {
    await unlockAudioPlayback();
    const line = sentences[sentenceIndex] ?? sentences[0];
    if (line) {
      setCurrentLine(line.sentence_text ?? '', resolveRwText(line) || undefined);
    }
    setStarted(true);
  };

  const handleTogglePause = useCallback(async () => {
    if (!started || completed || phase.kind === 'predict') return;

    if (userPausedRef.current) {
      userPausedRef.current = false;
      setUserPaused(false);
      await unlockAudioPlayback();

      const audio = audioRef.current;
      if (
        audio &&
        audio.src &&
        audio.paused &&
        audio.currentTime > 0 &&
        !audio.ended
      ) {
        setPlaying(true);
        try {
          await audio.play();
          rafRef.current = requestAnimationFrame(tickRecordedLipSync);
        } catch {
          await playCurrentSentenceRef.current();
        }
        return;
      }

      await playCurrentSentenceRef.current();
      return;
    }

    const audio = audioRef.current;
    const recordedPlaying = Boolean(audio && audio.src && !audio.paused);
    const ttsBusy = Boolean(stopTtsRef.current || ttsPauseResumeRef.current);

    if (!recordedPlaying && !ttsBusy) {
      return;
    }

    userPausedRef.current = true;
    setUserPaused(true);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopLipSyncRef.current?.();
    stopLipSyncRef.current = null;
    ttsActiveRef.current = false;

    if (recordedPlaying && audio) {
      audio.pause();
    } else {
      // TTS: stop cleanly; resume replays the current line
      stopTtsRef.current?.();
      stopTtsRef.current = null;
      ttsPauseResumeRef.current = null;
    }

    setMouthViseme('X');
    setPlaying(false);
  }, [
    completed,
    phase.kind,
    setMouthViseme,
    setPlaying,
    setUserPaused,
    started,
    tickRecordedLipSync,
  ]);

  useEffect(() => {
    if (completed || !started || phase.kind === 'predict') {
      setOnPlaybackPauseToggle(null);
      return;
    }
    setOnPlaybackPauseToggle(() => {
      void handleTogglePause();
    });
    return () => setOnPlaybackPauseToggle(null);
  }, [
    completed,
    handleTogglePause,
    phase.kind,
    setOnPlaybackPauseToggle,
    started,
  ]);

  const handleLanguageChange = (lang: DisplayLanguage) => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(`fable:lang:${storyId}`, lang);
      } catch {
        /* ignore quota / private mode */
      }
    }
    // Closing Keza via language switch should resume in the new language
    if (pausedByKezaRef.current) {
      pausedByKezaRef.current = false;
      userPausedRef.current = false;
      setUserPaused(false);
    }
    setActiveWordSpark(null);
    setDisplayLanguage(lang);
  };

  const openAskSheet = () => {
    cleanupPlayback();
    // Ask sheet replaces Keza — don't auto-resume under the sheet
    pausedByKezaRef.current = false;
    setActiveWordSpark(null);
    setAskOpen(true);
  };

  const closeAskSheet = () => {
    setAskOpen(false);
  };

  const languageToggle = (
    <div
      className="flex shrink-0 rounded-full bg-[#520e33]/80 p-0.5"
      role="group"
      aria-label="Story language"
    >
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
  );

  useEffect(() => {
    const hide =
      phase.kind === 'predict' ||
      phase.kind === 'celebrate' ||
      phase.kind === 'pack';
    setSceneChromeHidden(hide);
    return () => setSceneChromeHidden(false);
  }, [phase.kind, setSceneChromeHidden]);

  // Final done screen (no more activities)
  if (completed && phase.kind === 'done') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#1e1b18] px-6 py-12 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 50% 20%, rgba(255,121,86,0.28), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(196,165,116,0.18), transparent 45%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-3 animate-[bounce_0.8s_ease]">
            <KezaMascot size={88} />
          </div>
          <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-[#C4A574]">
            Urakoze · Well done
          </p>
          <h1 className="mb-3 font-headline-lg text-headline-lg text-[#fff8f5]">{title}</h1>
          <p
            className="mb-5 max-w-sm text-base text-[#ffdbd2]/90"
            style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
          >
            Keza is proud of you — what a story journey!
          </p>

          {(lastGameMessage || wordsSparked > 0) && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              {lastGameMessage && (
                <span
                  className="rounded-full border border-[#FF7956]/45 bg-[#2a1810]/90 px-3 py-1.5 text-sm text-[#fff8f5]"
                  style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
                >
                  ★ {lastGameMessage}
                </span>
              )}
              {wordsSparked > 0 && (
                <span
                  className="rounded-full border border-[#C4A574]/45 bg-[#241810]/90 px-3 py-1.5 text-sm text-[#ffdbd2]"
                  style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
                >
                  {wordsSparked} word{wordsSparked === 1 ? '' : 's'} sparked with Keza
                </span>
              )}
            </div>
          )}

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
              className="min-h-12 rounded-xl bg-[#FF7956] px-8 py-3 font-label-md tracking-widest text-white shadow-lg shadow-[#FF7956]/25"
            >
              See my finished stories
            </Link>
          </div>
          <StoryRecommendations currentStoryId={storyId} variant="dark" />
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
        <StoryCanvas showDialogueHud={false} />
        <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-[#1e1b18] via-[#1e1b18]/40 to-transparent px-6 pb-16 pt-32">
          <p className="mb-2 font-label-sm uppercase tracking-[0.3em] text-[#C4A574]">Inkuru</p>
          <h1 className="mb-6 max-w-lg text-center font-headline-md text-2xl text-[#fff8f5] md:text-3xl">
            {title}
          </h1>
          <div className="mb-5">{languageToggle}</div>
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

  // Letter Party — fullscreen kids UI (no 3D matching)
  if (completed && phase.kind === 'pack' && currentPackActivity) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden">
        <button
          type="button"
          onClick={skipToDone}
          className="absolute right-4 top-4 z-50 min-h-10 rounded-full border-2 border-[#e9d7d0] bg-[#fff8f5] px-4 font-bold text-[#520e33] shadow-md"
          style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
        >
          Maybe later
        </button>
        <WordBuildOverlay
          activity={currentPackActivity}
          onComplete={(score, total) => {
            logActivity('ACTIVITY_COMPLETED', {
              activityType: 'word_build',
              score,
              total,
              stars: score,
              correct: score === total,
            });
            finishGame(
              score === total
                ? `Letter Party complete! ${score}★`
                : `${score} of ${total} stars — keep going!`
            );
          }}
        />
      </div>
    );
  }

  const showHud = !completed && phase.kind !== 'predict';
  const showDialogueHud =
    !completed &&
    phase.kind !== 'predict' &&
    phase.kind !== 'celebrate' &&
    phase.kind !== 'pack';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1e1b18]">
      <StoryCanvas showDialogueHud={showDialogueHud} />

      {phase.kind === 'celebrate' && (
        <GameCompleteBurst
          title={phase.message}
          onDone={() => setPhase({ kind: 'done' })}
        />
      )}

      {showHud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#1e1b18]/90 to-transparent px-4 pb-8 pt-6">
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/kid/library"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#C4A574]/50 bg-[#241810]/90 px-3 py-1.5 text-xs uppercase tracking-widest text-[#ffdbd2]"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                <ArrowLeft size={14} strokeWidth={2.5} />
                Library
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={userPaused ? 'Resume story' : 'Pause story'}
                  onClick={() => void handleTogglePause()}
                  className="flex h-8 items-center gap-1 rounded-lg border-2 border-[#FF7956]/60 bg-[#520e33]/90 px-2 text-[#ffdbd2] hover:border-[#FF7956]"
                  title={userPaused ? 'Resume' : 'Pause'}
                >
                  {userPaused ? (
                    <Play size={16} strokeWidth={2.25} fill="currentColor" />
                  ) : (
                    <Pause size={16} strokeWidth={2.25} fill="currentColor" />
                  )}
                  <span
                    className="hidden text-[10px] uppercase tracking-wider sm:inline"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    {userPaused ? 'Play' : 'Pause'}
                  </span>
                </button>
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

            <div className="flex flex-col items-center gap-1.5">
              {languageToggle}
              {rwTranslating && displayLanguage === 'rw' && (
                <p
                  className="text-[10px] uppercase tracking-widest text-[#C4A574]"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  Translating to Kinyarwanda…
                </p>
              )}
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
