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

export type HairStyle = 'short' | 'braids' | 'bun' | 'afro' | 'wrap';

export type FaceShape = 'round' | 'oval' | 'elder';

export type GarmentStyle = 'tunic' | 'dress' | 'sash' | 'collar';

export type PersonalityPose = 'shy' | 'confident' | 'wise' | 'playful';

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
  hairStyle?: HairStyle;
  hairColor?: string;
  faceShape?: FaceShape;
  garmentStyle?: GarmentStyle;
  /** Affects idle animation personality */
  personalityPose?: PersonalityPose;
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

export type WeatherType = 'clear' | 'rain' | 'fireflies' | 'mist';

/** Sticky sky / lighting mood for the scene */
export type TimeOfDay = 'dawn' | 'midday' | 'dusk' | 'night';

/** Brief one-shot reaction on the active speaker */
export type ReactionGesture = 'nod' | 'wave' | 'clap' | 'point' | 'surprise';

/** Applied from a sentence index forward until a later event overrides fields */
export interface SceneEvent {
  addObjects?: EnvironmentObject[];
  removeTypes?: string[];
  lightingShift?: EnvironmentLighting;
  weather?: WeatherType;
  timeOfDay?: TimeOfDay;
  /** One-shot gesture for the active speaker at this sentence (not sticky) */
  gesture?: ReactionGesture;
  backgroundColor?: string;
  fogColor?: string;
  groundColor?: string;
  accentColor?: string;
}

/** Tap target on a prop — shows a cultural note / tooltip card */
export interface StoryHotspot {
  id: string;
  /** Matches EnvironmentObject.type */
  propType: string;
  /** When set, only the Nth prop of that type is clickable (0-based among same type) */
  propIndex?: number;
  title: string;
  body: string;
  titleRw?: string;
  bodyRw?: string;
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
  /** Sentence-index keys ("0", "1", …) → sticky scene changes */
  sceneEvents?: Record<string, SceneEvent>;
  hotspots?: StoryHotspot[];
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
