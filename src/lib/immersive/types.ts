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

/** Matches VALID_PROP_TYPES / SCENE_PROP_TYPES */
export type PropType =
  | 'tree'
  | 'hut'
  | 'fire'
  | 'stall'
  | 'board'
  | 'rock'
  | 'flower'
  | 'bench'
  | 'banana_tree'
  | 'path'
  | 'water_jug'
  | 'drum'
  | 'goat'
  | 'millet_field';

export type SceneMood =
  | 'warm'
  | 'solemn'
  | 'playful'
  | 'tense'
  | 'nostalgic'
  | 'hopeful'
  | 'cozy';

export type SceneDensity = 'sparse' | 'balanced' | 'busy';

export type ScenePropRole = 'landmark' | 'focus' | 'dressing';

export interface SceneBriefKeyProp {
  /** Must be a VALID_PROP_TYPES value */
  type: PropType;
  role: ScenePropRole;
  /** Optional kid-facing note (hotspot seed later); not a prop id */
  note?: string;
}

/**
 * Sentence-anchored TOD beats — same keying as sceneEvents:
 * keys are sentence indices as strings ("0", "1", …).
 */
export type SceneBriefTimeOfDayArc = Record<string, TimeOfDay>;

export interface SceneBriefPaletteHint {
  warmth: number;
  saturation: number;
  contrast: number;
  /** Optional accent hex bias; sanitized like other scene colors */
  accentBias?: string;
}

/** Semantic creative direction compiled onto a biome preset */
export interface SceneBrief {
  mood: SceneMood;
  paletteHint: SceneBriefPaletteHint;
  /** 1–5 props; types must be in VALID_PROP_TYPES; deduped by type */
  keyProps: SceneBriefKeyProp[];
  density: SceneDensity;
  /**
   * Sticky TOD from each sentence index onward (same semantics as sceneEvents).
   * Example: { "0": "dawn", "4": "dusk", "8": "night" }
   */
  timeOfDayArc?: SceneBriefTimeOfDayArc;
  /** Optional default atmosphere until a sceneEvent overrides */
  weatherBias?: WeatherType;
}

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

/** Post-story / mid-end engagement activities (stored on animation_data) */
export type EngagementActivityType =
  | 'treasure_hunt'
  | 'sequence'
  | 'vocab_match'
  | 'predict_next';

export interface TreasureHuntTarget {
  propType: PropType;
  clueEn: string;
  clueRw?: string;
  revealEn?: string;
  revealRw?: string;
}

export interface TreasureHuntActivity {
  type: 'treasure_hunt';
  introEn: string;
  introRw?: string;
  targets: TreasureHuntTarget[];
}

export interface SequenceBeat {
  id: string;
  labelEn: string;
  labelRw?: string;
  correctOrder: number;
}

export interface SequenceActivity {
  type: 'sequence';
  promptEn: string;
  promptRw?: string;
  beats: SequenceBeat[];
}

export interface VocabMatchPair {
  wordRw: string;
  glossEn: string;
  propType: PropType;
}

export interface VocabMatchActivity {
  type: 'vocab_match';
  promptEn: string;
  promptRw?: string;
  pairs: VocabMatchPair[];
}

export interface PredictNextChoice {
  id: string;
  textEn: string;
  textRw?: string;
}

export interface PredictNextActivity {
  type: 'predict_next';
  promptEn: string;
  promptRw?: string;
  choices: PredictNextChoice[];
  correctChoiceId: string;
  encouragementEn: string;
  encouragementRw?: string;
}

export type EngagementActivity =
  | TreasureHuntActivity
  | SequenceActivity
  | VocabMatchActivity
  | PredictNextActivity;

/** Scene interaction mode during engagement activities */
export type EngagementSceneMode = 'off' | 'explore' | 'hunt' | 'vocab' | 'glow';

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
  /** Semantic dressing direction; stored normalized; compile → sceneSpec is Stage 4 */
  sceneBrief?: SceneBrief;
  /** Sentence-index keys ("0", "1", …) → sticky scene changes */
  sceneEvents?: Record<string, SceneEvent>;
  hotspots?: StoryHotspot[];
  /** Post-story pack + predict_next — generated with the story */
  engagementActivities?: EngagementActivity[];
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
