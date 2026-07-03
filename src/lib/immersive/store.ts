import { create } from 'zustand';
import type {
  DisplayLanguage,
  EnvironmentType,
  RhubarbViseme,
  StoryCharacterSlot,
  StorySceneSpec,
} from './types';
import { resolveEnvironmentPreset } from './sceneSpec';

export const CAMERA_ZOOM_MIN = 2.8;
export const CAMERA_ZOOM_MAX = 7;
export const CAMERA_ZOOM_DEFAULT = 4.2;

interface ImmersiveStore {
  storyId: string | null;
  environment: EnvironmentType;
  sceneSpec: StorySceneSpec | null;
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

  setPreviewWorld: (input: {
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    sceneSpec?: StorySceneSpec | null;
    useAiVoice?: boolean;
    worldPreview?: boolean;
  }) => void;
  setWorldPreviewActive: (active: boolean) => void;
  init: (input: {
    storyId: string;
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    sceneSpec?: StorySceneSpec | null;
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
  reset: () => void;
}

export const useImmersiveStore = create<ImmersiveStore>((set) => ({
  storyId: null,
  environment: 'village',
  sceneSpec: null,
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

  setPreviewWorld: ({ environment, characters, sceneSpec, useAiVoice, worldPreview }) =>
    set({
      storyId: 'preview',
      environment,
      sceneSpec: sceneSpec ?? null,
      characters,
      useAiVoice: useAiVoice ?? false,
      isImmersive: true,
      activeCharacterIndex: 0,
      worldPreviewActive: worldPreview ?? false,
    }),

  setWorldPreviewActive: (active) => set({ worldPreviewActive: active }),

  init: ({ storyId, environment, characters, sceneSpec, isImmersive, useAiVoice }) =>
    set({
      storyId,
      environment,
      sceneSpec: sceneSpec ?? null,
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
  reset: () =>
    set({
      storyId: null,
      sceneSpec: null,
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
    }),
}));

export function useEnvironmentPreset() {
  const environment = useImmersiveStore((s) => s.environment);
  const sceneSpec = useImmersiveStore((s) => s.sceneSpec);
  return resolveEnvironmentPreset(environment, sceneSpec);
}
