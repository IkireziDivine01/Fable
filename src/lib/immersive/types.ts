export type EnvironmentType = 'forest' | 'home' | 'village' | 'school' | 'market';

export type CharacterType = 'boy' | 'girl' | 'grandma' | 'grandpa' | 'dog' | 'teacher';

export type MouthShape = 'closed' | 'small' | 'medium' | 'wide';

export type DisplayLanguage = 'en' | 'rw';

export interface MouthSyncTiming {
  time: number;
  shape: MouthShape;
}

export interface StoryCharacterSlot {
  id?: string;
  name: string;
  type: CharacterType;
  position: number;
  mouthSyncTimings?: MouthSyncTiming[];
}

export interface EnvironmentObject {
  type: string;
  x: number;
  z?: number;
}

export interface EnvironmentLighting {
  color: string;
  intensity: number;
}

export interface EnvironmentPreset {
  environmentType: EnvironmentType;
  backgroundColor: string;
  objects: EnvironmentObject[];
  lighting: EnvironmentLighting;
  fogColor?: string;
  groundColor?: string;
  accentColor?: string;
}

export interface AnimationData {
  version: number;
  useAiVoice?: boolean;
  sentenceTimings?: Record<string, MouthSyncTiming[]>;
}

export interface ImmersiveStoryMeta {
  environment: EnvironmentType;
  characters: StoryCharacterSlot[];
  audioUrl?: string | null;
  videoUrl?: string | null;
  isImmersive: boolean;
  animationData: AnimationData;
}

export interface ImmersivePlaybackState {
  sentenceIndex: number;
  isPlaying: boolean;
  mouthOpenness: number;
  activeCharacterIndex: number;
}
