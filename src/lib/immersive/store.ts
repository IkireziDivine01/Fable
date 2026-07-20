import { useMemo } from 'react';
import { create } from 'zustand';
import { compileSceneBrief } from './sceneBrief';
import {
  mergeHotspots,
  resolveSceneAtSentence,
} from './sceneEvents';
import { resolveEnvironmentPreset } from './sceneSpec';
import type {
  DisplayLanguage,
  EngagementSceneMode,
  EnvironmentPreset,
  EnvironmentType,
  ReactionGesture,
  RhubarbViseme,
  SceneBrief,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
  TimeOfDay,
  VocabMatchPair,
  WeatherType,
} from './types';

export const CAMERA_ZOOM_MIN = 2.8;
export const CAMERA_ZOOM_MAX = 7;
export const CAMERA_ZOOM_DEFAULT = 4.2;

export type ActiveWordSpark = {
  word: string;
  sentence: string;
  sentenceIndex: number;
};

interface ImmersiveStore {
  storyId: string | null;
  environment: EnvironmentType;
  /** Raw stored override (if any). Compiled with sceneBrief at resolve time. */
  sceneSpec: StorySceneSpec | null;
  /** Semantic dressing; compiled → baseSpec at read/render time only. */
  sceneBrief: SceneBrief | null;
  sceneEvents: Record<string, SceneEvent>;
  hotspots: StoryHotspot[];
  activeHotspotId: string | null;
  /** Keza Word Spark — tapped dialogue word */
  activeWordSpark: ActiveWordSpark | null;
  /** Wired by ImmersiveStoryPlayer — pause narration when Keza opens */
  onWordSparkOpen: (() => void) | null;
  /** Vocab pairs for instant Word Spark glosses */
  wordSparkVocabHints: VocabMatchPair[];
  characters: StoryCharacterSlot[];
  sentenceIndex: number;
  sentenceCount: number;
  /** Wired by ImmersiveStoryPlayer — advances line or finishes the story. */
  onDialogueAdvance: (() => void) | null;
  /** Wired by ImmersiveStoryPlayer — pause/resume narration. */
  onPlaybackPauseToggle: (() => void) | null;
  /** True when the kid explicitly paused (vs line finished / loading). */
  userPaused: boolean;
  isPlaying: boolean;
  mouthViseme: RhubarbViseme;
  activeCharacterIndex: number;
  isImmersive: boolean;
  useAiVoice: boolean;
  currentSentenceText: string;
  currentKinyarwandaText: string;
  displayLanguage: DisplayLanguage;
  cameraZoom: number;
  worldPreviewActive: boolean;
  ambientMuted: boolean;
  /** Hide 3D speech bubbles / nameplates (predict, pack, etc.) */
  sceneChromeHidden: boolean;
  /** off = free explore hotspots; hunt/vocab = gated prop taps */
  engagementMode: EngagementSceneMode;
  /** Prop types currently interactive in hunt/vocab mode */
  engagementTargetPropTypes: string[];
  foundPropTypes: string[];
  /** Expected prop for current vocab pair */
  vocabExpectedPropType: string | null;
  /** Brief flash when kid taps wrong prop */
  wrongTapPropType: string | null;
  /** Strong pulse after kid asks for a hint */
  hintPropType: string | null;
  /** Hunt reveal overrides HotspotCard title/body when set */
  huntReveal: { title: string; body: string; titleRw?: string; bodyRw?: string } | null;
  onEngagementPropSelect: ((propType: string) => void) | null;

  setPreviewWorld: (input: {
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    sceneSpec?: StorySceneSpec | null;
    sceneBrief?: SceneBrief | null;
    sceneEvents?: Record<string, SceneEvent> | null;
    hotspots?: StoryHotspot[] | null;
    useAiVoice?: boolean;
    worldPreview?: boolean;
  }) => void;
  setWorldPreviewActive: (active: boolean) => void;
  init: (input: {
    storyId: string;
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    sceneSpec?: StorySceneSpec | null;
    sceneBrief?: SceneBrief | null;
    sceneEvents?: Record<string, SceneEvent> | null;
    hotspots?: StoryHotspot[] | null;
    isImmersive: boolean;
    useAiVoice?: boolean;
  }) => void;
  setCurrentLine: (text: string, kinyarwanda?: string) => void;
  setUseAiVoice: (value: boolean) => void;
  setDisplayLanguage: (lang: DisplayLanguage) => void;
  setCameraZoom: (zoom: number) => void;
  adjustCameraZoom: (delta: number) => void;
  setSentenceIndex: (index: number) => void;
  setSentenceCount: (count: number) => void;
  setOnDialogueAdvance: (handler: (() => void) | null) => void;
  setOnPlaybackPauseToggle: (handler: (() => void) | null) => void;
  setUserPaused: (paused: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setMouthViseme: (value: RhubarbViseme) => void;
  setActiveCharacterIndex: (index: number) => void;
  setActiveHotspot: (id: string | null) => void;
  setActiveWordSpark: (spark: ActiveWordSpark | null) => void;
  setOnWordSparkOpen: (handler: (() => void) | null) => void;
  setWordSparkVocabHints: (pairs: VocabMatchPair[]) => void;
  setAmbientMuted: (muted: boolean) => void;
  setSceneChromeHidden: (hidden: boolean) => void;
  setEngagementMode: (mode: EngagementSceneMode) => void;
  setEngagementTargetPropTypes: (types: string[]) => void;
  setFoundPropTypes: (types: string[]) => void;
  markPropFound: (propType: string) => void;
  setVocabExpectedPropType: (propType: string | null) => void;
  setWrongTapPropType: (propType: string | null) => void;
  setHintPropType: (propType: string | null) => void;
  setHuntReveal: (
    reveal: { title: string; body: string; titleRw?: string; bodyRw?: string } | null
  ) => void;
  setOnEngagementPropSelect: (handler: ((propType: string) => void) | null) => void;
  resetEngagement: () => void;
  reset: () => void;
}

/** Compile brief → baseSpec when present; otherwise keep stored sceneSpec as-is. */
function resolveBaseSceneSpec(
  environment: EnvironmentType,
  sceneSpec: StorySceneSpec | null | undefined,
  sceneBrief: SceneBrief | null | undefined
): StorySceneSpec | null {
  if (sceneBrief) {
    return compileSceneBrief(environment, sceneBrief, sceneSpec);
  }
  return sceneSpec ?? null;
}

function resolveHotspots(
  hotspots: StoryHotspot[] | null | undefined,
  sceneSpec: StorySceneSpec | null | undefined,
  environment: EnvironmentType
): StoryHotspot[] {
  const objects =
    sceneSpec?.objects ?? resolveEnvironmentPreset(environment, sceneSpec).objects;
  return mergeHotspots(hotspots ?? undefined, objects);
}

export const useImmersiveStore = create<ImmersiveStore>((set) => ({
  storyId: null,
  environment: 'village',
  sceneSpec: null,
  sceneBrief: null,
  sceneEvents: {},
  hotspots: [],
  activeHotspotId: null,
  activeWordSpark: null,
  onWordSparkOpen: null,
  wordSparkVocabHints: [],
  characters: [{ name: 'Grandmother', type: 'grandma', position: 1 }],
  sentenceIndex: 0,
  sentenceCount: 0,
  onDialogueAdvance: null,
  onPlaybackPauseToggle: null,
  userPaused: false,
  isPlaying: false,
  mouthViseme: 'X',
  activeCharacterIndex: 0,
  isImmersive: true,
  useAiVoice: false,
  currentSentenceText: '',
  currentKinyarwandaText: '',
  displayLanguage: 'en',
  cameraZoom: CAMERA_ZOOM_DEFAULT,
  worldPreviewActive: false,
  ambientMuted: false,
  sceneChromeHidden: false,
  engagementMode: 'off',
  engagementTargetPropTypes: [],
  foundPropTypes: [],
  vocabExpectedPropType: null,
  wrongTapPropType: null,
  hintPropType: null,
  huntReveal: null,
  onEngagementPropSelect: null,

  setPreviewWorld: ({
    environment,
    characters,
    sceneSpec,
    sceneBrief,
    sceneEvents,
    hotspots,
    useAiVoice,
    worldPreview,
  }) => {
    const storedSpec = sceneSpec ?? null;
    const storedBrief = sceneBrief ?? null;
    const baseSpec = resolveBaseSceneSpec(environment, storedSpec, storedBrief);
    return set({
      storyId: 'preview',
      environment,
      sceneSpec: storedSpec,
      sceneBrief: storedBrief,
      sceneEvents: sceneEvents ?? {},
      hotspots: resolveHotspots(hotspots, baseSpec, environment),
      activeHotspotId: null,
      activeWordSpark: null,
      characters,
      useAiVoice: useAiVoice ?? false,
      isImmersive: true,
      activeCharacterIndex: 0,
      worldPreviewActive: worldPreview ?? false,
    });
  },

  setWorldPreviewActive: (active) => set({ worldPreviewActive: active }),

  init: ({
    storyId,
    environment,
    characters,
    sceneSpec,
    sceneBrief,
    sceneEvents,
    hotspots,
    isImmersive,
    useAiVoice,
  }) => {
    const prev = useImmersiveStore.getState();
    const sameStory = prev.storyId === storyId;
    let displayLanguage: DisplayLanguage =
      sameStory && (prev.displayLanguage === 'en' || prev.displayLanguage === 'rw')
        ? prev.displayLanguage
        : 'en';
    if (typeof window !== 'undefined') {
      try {
        const saved = window.sessionStorage.getItem(`fable:lang:${storyId}`);
        if (saved === 'en' || saved === 'rw') displayLanguage = saved;
      } catch {
        /* ignore */
      }
    }

    const storedSpec = sceneSpec ?? null;
    const storedBrief = sceneBrief ?? null;
    const baseSpec = resolveBaseSceneSpec(environment, storedSpec, storedBrief);
    return set({
      storyId,
      environment,
      sceneSpec: storedSpec,
      sceneBrief: storedBrief,
      sceneEvents: sceneEvents ?? {},
      hotspots: resolveHotspots(hotspots, baseSpec, environment),
      activeHotspotId: null,
      activeWordSpark: null,
      onWordSparkOpen: null,
      wordSparkVocabHints: sameStory ? prev.wordSparkVocabHints : [],
      characters:
        characters.length > 0 ? characters : [{ name: 'Grandmother', type: 'grandma', position: 1 }],
      isImmersive,
      useAiVoice: useAiVoice ?? false,
      // Keep progress + dialogue when the same story re-inits (scene deps refresh).
      // Fresh stories start clean; ImmersiveStoryPlayer resets index on storyId mount.
      sentenceIndex: sameStory ? prev.sentenceIndex : 0,
      sentenceCount: sameStory ? prev.sentenceCount : 0,
      onDialogueAdvance: null,
      onPlaybackPauseToggle: null,
      userPaused: false,
      isPlaying: false,
      mouthViseme: 'X',
      activeCharacterIndex: sameStory ? prev.activeCharacterIndex : 0,
      currentSentenceText: sameStory ? prev.currentSentenceText : '',
      currentKinyarwandaText: sameStory ? prev.currentKinyarwandaText : '',
      displayLanguage,
      cameraZoom: sameStory ? prev.cameraZoom : CAMERA_ZOOM_DEFAULT,
      ambientMuted: sameStory ? prev.ambientMuted : false,
      engagementMode: 'off',
      engagementTargetPropTypes: [],
      foundPropTypes: [],
      vocabExpectedPropType: null,
      wrongTapPropType: null,
      hintPropType: null,
      huntReveal: null,
      onEngagementPropSelect: null,
    });
  },

  setCurrentLine: (text, kinyarwanda) =>
    set({ currentSentenceText: text, currentKinyarwandaText: kinyarwanda ?? '' }),

  setUseAiVoice: (value) => set({ useAiVoice: value }),

  setDisplayLanguage: (lang) => set({ displayLanguage: lang }),

  setCameraZoom: (zoom) =>
    set({ cameraZoom: Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, zoom)) }),

  adjustCameraZoom: (delta) =>
    set((state) => ({
      cameraZoom: Math.min(
        CAMERA_ZOOM_MAX,
        Math.max(CAMERA_ZOOM_MIN, state.cameraZoom + delta)
      ),
    })),

  setSentenceIndex: (index) =>
    set({ sentenceIndex: index, mouthViseme: 'X', activeWordSpark: null }),
  setSentenceCount: (count) => set({ sentenceCount: count }),
  setOnDialogueAdvance: (handler) => set({ onDialogueAdvance: handler }),
  setOnPlaybackPauseToggle: (handler) => set({ onPlaybackPauseToggle: handler }),
  setUserPaused: (paused) => set({ userPaused: paused }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setMouthViseme: (value) => set({ mouthViseme: value }),
  setActiveCharacterIndex: (index) => set({ activeCharacterIndex: index }),
  setActiveHotspot: (id) => set({ activeHotspotId: id }),
  setActiveWordSpark: (spark) => set({ activeWordSpark: spark }),
  setOnWordSparkOpen: (handler) => set({ onWordSparkOpen: handler }),
  setWordSparkVocabHints: (pairs) => set({ wordSparkVocabHints: pairs }),
  setAmbientMuted: (muted) => set({ ambientMuted: muted }),
  setSceneChromeHidden: (hidden) => set({ sceneChromeHidden: hidden }),
  setEngagementMode: (mode) => set({ engagementMode: mode }),
  setEngagementTargetPropTypes: (types) => set({ engagementTargetPropTypes: types }),
  setFoundPropTypes: (types) => set({ foundPropTypes: types }),
  markPropFound: (propType) =>
    set((state) =>
      state.foundPropTypes.includes(propType)
        ? state
        : { foundPropTypes: [...state.foundPropTypes, propType] }
    ),
  setVocabExpectedPropType: (propType) => set({ vocabExpectedPropType: propType }),
  setWrongTapPropType: (propType) => set({ wrongTapPropType: propType }),
  setHintPropType: (propType) => set({ hintPropType: propType }),
  setHuntReveal: (reveal) => set({ huntReveal: reveal }),
  setOnEngagementPropSelect: (handler) => set({ onEngagementPropSelect: handler }),
  resetEngagement: () =>
    set({
      engagementMode: 'off',
      engagementTargetPropTypes: [],
      foundPropTypes: [],
      vocabExpectedPropType: null,
      wrongTapPropType: null,
      hintPropType: null,
      huntReveal: null,
      onEngagementPropSelect: null,
      activeHotspotId: null,
      activeWordSpark: null,
      sceneChromeHidden: false,
    }),
  reset: () =>
    set({
      storyId: null,
      sceneSpec: null,
      sceneBrief: null,
      sceneEvents: {},
      hotspots: [],
      activeHotspotId: null,
      activeWordSpark: null,
      onWordSparkOpen: null,
      wordSparkVocabHints: [],
      characters: [],
      sentenceIndex: 0,
      sentenceCount: 0,
      onDialogueAdvance: null,
      onPlaybackPauseToggle: null,
      userPaused: false,
      isPlaying: false,
      mouthViseme: 'X',
      activeCharacterIndex: 0,
      isImmersive: false,
      useAiVoice: false,
      currentSentenceText: '',
      currentKinyarwandaText: '',
      displayLanguage: 'en',
      cameraZoom: CAMERA_ZOOM_DEFAULT,
      worldPreviewActive: false,
      ambientMuted: false,
      sceneChromeHidden: false,
      engagementMode: 'off',
      engagementTargetPropTypes: [],
      foundPropTypes: [],
      vocabExpectedPropType: null,
      wrongTapPropType: null,
      hintPropType: null,
      huntReveal: null,
      onEngagementPropSelect: null,
    }),
}));

export function useResolvedScene() {
  const environment = useImmersiveStore((s) => s.environment);
  const sceneSpec = useImmersiveStore((s) => s.sceneSpec);
  const sceneBrief = useImmersiveStore((s) => s.sceneBrief);
  const sceneEvents = useImmersiveStore((s) => s.sceneEvents);
  const sentenceIndex = useImmersiveStore((s) => s.sentenceIndex);

  // Compile only when env/brief/spec change — not on every sentence tick
  const baseSpec = useMemo(
    () => resolveBaseSceneSpec(environment, sceneSpec, sceneBrief),
    [environment, sceneSpec, sceneBrief]
  );

  return useMemo(
    () => resolveSceneAtSentence(environment, baseSpec, sceneEvents, sentenceIndex),
    [environment, baseSpec, sceneEvents, sentenceIndex]
  );
}

export function useEnvironmentPreset(): EnvironmentPreset {
  const environment = useImmersiveStore((s) => s.environment);
  const resolved = useResolvedScene();
  return useMemo(
    () => resolveEnvironmentPreset(environment, resolved.sceneSpec),
    [environment, resolved.sceneSpec]
  );
}

export function useActiveWeather(): WeatherType {
  return useResolvedScene().weather;
}

export function useActiveTimeOfDay(): TimeOfDay {
  return useResolvedScene().timeOfDay;
}

export function useActiveGesture(): ReactionGesture | null {
  return useResolvedScene().gesture;
}
