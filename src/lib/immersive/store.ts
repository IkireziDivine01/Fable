import { create } from 'zustand';
import type { DisplayLanguage, EnvironmentType, StoryCharacterSlot } from './types';
import { getEnvironmentPreset } from './presets';

export const CAMERA_ZOOM_MIN = 2.8;
export const CAMERA_ZOOM_MAX = 7;
export const CAMERA_ZOOM_DEFAULT = 4.2;

interface ImmersiveStore {
  storyId: string | null;
  environment: EnvironmentType;
  characters: StoryCharacterSlot[];
  sentenceIndex: number;
  isPlaying: boolean;
  mouthOpenness: number;
  activeCharacterIndex: number;
  isImmersive: boolean;
  useAiVoice: boolean;
  currentSentenceText: string;
  currentKinyarwandaText: string;
  displayLanguage: DisplayLanguage;
  cameraZoom: number;

  setPreviewWorld: (input: {
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
    useAiVoice?: boolean;
  }) => void;
  init: (input: {
    storyId: string;
    environment: EnvironmentType;
    characters: StoryCharacterSlot[];
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
  setMouthOpenness: (value: number) => void;
  setActiveCharacterIndex: (index: number) => void;
  reset: () => void;
}

export const useImmersiveStore = create<ImmersiveStore>((set) => ({
  storyId: null,
  environment: 'village',
  characters: [{ name: 'Grandmother', type: 'grandma', position: 1 }],
  sentenceIndex: 0,
  isPlaying: false,
  mouthOpenness: 0,
  activeCharacterIndex: 0,
  isImmersive: true,
  useAiVoice: false,
  currentSentenceText: '',
  currentKinyarwandaText: '',
  displayLanguage: 'en',
  cameraZoom: CAMERA_ZOOM_DEFAULT,

  setPreviewWorld: ({ environment, characters, useAiVoice }) =>
    set({
      storyId: 'preview',
      environment,
      characters,
      useAiVoice: useAiVoice ?? false,
      isImmersive: true,
      activeCharacterIndex: 0,
    }),

  init: ({ storyId, environment, characters, isImmersive, useAiVoice }) =>
    set({
      storyId,
      environment,
      characters:
        characters.length > 0 ? characters : [{ name: 'Grandmother', type: 'grandma', position: 1 }],
      isImmersive,
      useAiVoice: useAiVoice ?? false,
      sentenceIndex: 0,
      isPlaying: false,
      mouthOpenness: 0,
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

  setSentenceIndex: (index) => set({ sentenceIndex: index, mouthOpenness: 0 }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setMouthOpenness: (value) => set({ mouthOpenness: value }),
  setActiveCharacterIndex: (index) => set({ activeCharacterIndex: index }),
  reset: () =>
    set({
      storyId: null,
      characters: [],
      sentenceIndex: 0,
      isPlaying: false,
      mouthOpenness: 0,
      activeCharacterIndex: 0,
      isImmersive: false,
      useAiVoice: false,
      currentSentenceText: '',
      currentKinyarwandaText: '',
      displayLanguage: 'en',
      cameraZoom: CAMERA_ZOOM_DEFAULT,
    }),
}));

export function useEnvironmentPreset() {
  const environment = useImmersiveStore((s) => s.environment);
  return getEnvironmentPreset(environment);
}
