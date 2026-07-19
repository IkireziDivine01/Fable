import { useMemo } from 'react';
import { create } from 'zustand';
import {
  mergeHotspots,
  resolveSceneAtSentence,
} from './sceneEvents';
import { resolveEnvironmentPreset } from './sceneSpec';
import type {
  DisplayLanguage,
  EnvironmentPreset,
  EnvironmentType,
  ReactionGesture,
  RhubarbViseme,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
  TimeOfDay,
  WeatherType,
} from './types';

export const CAMERA_ZOOM_MIN = 2.8;
export const CAMERA_ZOOM_MAX = 7;
export const CAMERA_ZOOM_DEFAULT = 4.2;

interface ImmersiveStore {
  storyId: string | null;
  environment: EnvironmentType;
  sceneSpec: StorySceneSpec | null;
  sceneEvents: Record<string, SceneEvent>;
  hotspots: StoryHotspot[];
  activeHotspotId: string | null;
  characters: StoryCharacterSlot[];
  sentenceIndex: number;
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

  setPreviewWorld: (input: {
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    sceneSpec?: StorySceneSpec | null;
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
  setPlaying: (playing: boolean) => void;
  setMouthViseme: (value: RhubarbViseme) => void;
  setActiveCharacterIndex: (index: number) => void;
  setActiveHotspot: (id: string | null) => void;
  setAmbientMuted: (muted: boolean) => void;
  reset: () => void;
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
  sceneEvents: {},
  hotspots: [],
  activeHotspotId: null,
  characters: [{ name: 'Grandmother', type: 'grandma', position: 1 }],
  sentenceIndex: 0,
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

  setPreviewWorld: ({
    environment,
    characters,
    sceneSpec,
    sceneEvents,
    hotspots,
    useAiVoice,
    worldPreview,
  }) =>
    set({
      storyId: 'preview',
      environment,
      sceneSpec: sceneSpec ?? null,
      sceneEvents: sceneEvents ?? {},
      hotspots: resolveHotspots(hotspots, sceneSpec, environment),
      activeHotspotId: null,
      characters,
      useAiVoice: useAiVoice ?? false,
      isImmersive: true,
      activeCharacterIndex: 0,
      worldPreviewActive: worldPreview ?? false,
    }),

  setWorldPreviewActive: (active) => set({ worldPreviewActive: active }),

  init: ({
    storyId,
    environment,
    characters,
    sceneSpec,
    sceneEvents,
    hotspots,
    isImmersive,
    useAiVoice,
  }) =>
    set({
      storyId,
      environment,
      sceneSpec: sceneSpec ?? null,
      sceneEvents: sceneEvents ?? {},
      hotspots: resolveHotspots(hotspots, sceneSpec, environment),
      activeHotspotId: null,
      characters:
        characters.length > 0 ? characters : [{ name: 'Grandmother', type: 'grandma', position: 1 }],
      isImmersive,
      useAiVoice: useAiVoice ?? false,
      sentenceIndex: 0,
      isPlaying: false,
      mouthViseme: 'X',
      activeCharacterIndex: 0,
      currentSentenceText: '',
      currentKinyarwandaText: '',
      displayLanguage: 'en',
      cameraZoom: CAMERA_ZOOM_DEFAULT,
      ambientMuted: false,
    }),

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

  setSentenceIndex: (index) => set({ sentenceIndex: index, mouthViseme: 'X' }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setMouthViseme: (value) => set({ mouthViseme: value }),
  setActiveCharacterIndex: (index) => set({ activeCharacterIndex: index }),
  setActiveHotspot: (id) => set({ activeHotspotId: id }),
  setAmbientMuted: (muted) => set({ ambientMuted: muted }),
  reset: () =>
    set({
      storyId: null,
      sceneSpec: null,
      sceneEvents: {},
      hotspots: [],
      activeHotspotId: null,
      characters: [],
      sentenceIndex: 0,
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
    }),
}));

export function useResolvedScene() {
  const environment = useImmersiveStore((s) => s.environment);
  const sceneSpec = useImmersiveStore((s) => s.sceneSpec);
  const sceneEvents = useImmersiveStore((s) => s.sceneEvents);
  const sentenceIndex = useImmersiveStore((s) => s.sentenceIndex);
  return useMemo(
    () => resolveSceneAtSentence(environment, sceneSpec, sceneEvents, sentenceIndex),
    [environment, sceneSpec, sceneEvents, sentenceIndex]
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
