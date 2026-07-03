export type EnvironmentType = 'forest' | 'home' | 'village' | 'school' | 'market';

export type CharacterType = 'boy' | 'girl' | 'grandma' | 'grandpa' | 'dog' | 'teacher';

/** Rhubarb lip-sync viseme categories */
export type RhubarbViseme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

/** @deprecated Use RhubarbViseme — kept for stored animationData compatibility */
export type MouthShape = RhubarbViseme | 'closed' | 'small' | 'medium' | 'wide';

export type DisplayLanguage = 'en' | 'rw';

export interface MouthSyncTiming {
  time: number;
  shape: MouthShape;
}

export type CharacterAccessory = 'headwrap' | 'necklace';

export interface CharacterAppearance {
  skinColor: string;
  garmentColor: string;
  accentColor: string;
  heightScale?: number;
  eyeColor?: string;
  /** When true, draws cheek blush on the canvas face */
  hasBlush?: boolean;
  blushColor?: string;
  /** Single color or band/stripe colors for torso garment */
  bodyPattern?: string | string[];
  accessories?: CharacterAccessory[];
}

export interface StoryCharacterSlot {
  id?: string;
  name: string;
  type: CharacterType;
  position: number;
  description?: string;
  appearance?: CharacterAppearance;
  mouthSyncTimings?: MouthSyncTiming[];
}

export interface EnvironmentObject {
  type: string;
  x: number;
  z?: number;
  scale?: number;
}

export interface StorySceneSpec {
  backgroundColor: string;
  fogColor: string;
  groundColor: string;
  accentColor: string;
  lighting: EnvironmentLighting;
  objects: EnvironmentObject[];
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
  environmentDescription?: string;
  sceneSpec?: StorySceneSpec;
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
  mouthViseme: RhubarbViseme;
  activeCharacterIndex: number;
}
