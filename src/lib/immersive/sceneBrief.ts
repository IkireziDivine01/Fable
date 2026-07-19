import { getEnvironmentPreset } from './presets';
import { clampNumber, sanitizeHex, VALID_PROP_TYPES } from './sceneSpec';
import { VALID_TIME_OF_DAY } from './timeOfDay';
import type {
  EnvironmentObject,
  EnvironmentType,
  PropType,
  SceneBrief,
  SceneBriefKeyProp,
  SceneBriefPaletteHint,
  SceneBriefTimeOfDayArc,
  SceneDensity,
  SceneMood,
  ScenePropRole,
  StorySceneSpec,
  TimeOfDay,
  WeatherType,
} from './types';

const VALID_MOODS = new Set<SceneMood>([
  'warm',
  'solemn',
  'playful',
  'tense',
  'nostalgic',
  'hopeful',
  'cozy',
]);

const VALID_DENSITIES = new Set<SceneDensity>(['sparse', 'balanced', 'busy']);

const VALID_ROLES = new Set<ScenePropRole>(['landmark', 'focus', 'dressing']);

const VALID_WEATHER = new Set<WeatherType>(['clear', 'rain', 'fireflies', 'mist']);

const DENSITY_TARGET: Record<SceneDensity, { min: number; max: number }> = {
  sparse: { min: 2, max: 3 },
  balanced: { min: 4, max: 5 },
  busy: { min: 6, max: 8 },
};

/** Mood → relative shifts applied on top of the biome (or existing) palette */
const MOOD_TINT: Record<
  SceneMood,
  {
    background: string;
    fog: string;
    ground: string;
    accent: string;
    light: string;
    intensityDelta: number;
    mix: number;
  }
> = {
  warm: {
    background: '#5C2E14',
    fog: '#C4A574',
    ground: '#D4A574',
    accent: '#FF7956',
    light: '#FFE4B5',
    intensityDelta: 0.06,
    mix: 0.52,
  },
  solemn: {
    background: '#1A1A24',
    fog: '#4A4A5A',
    ground: '#3D3A36',
    accent: '#6B6B7B',
    light: '#C8C4D4',
    intensityDelta: -0.12,
    mix: 0.55,
  },
  playful: {
    background: '#2A4A3A',
    fog: '#7BC4A0',
    ground: '#C4D4A0',
    accent: '#E85D4C',
    light: '#FFF0D0',
    intensityDelta: 0.1,
    mix: 0.52,
  },
  tense: {
    // Cooler, desaturated crimson — distinct from warm/cozy orange-brown
    background: '#241018',
    fog: '#5A3840',
    ground: '#423438',
    accent: '#C04058',
    light: '#D0A8B0',
    intensityDelta: -0.1,
    mix: 0.53,
  },
  nostalgic: {
    background: '#3D2418',
    fog: '#C08060',
    ground: '#B89070',
    accent: '#A06050',
    light: '#F0D0B8',
    intensityDelta: -0.04,
    mix: 0.52,
  },
  hopeful: {
    background: '#3A6080',
    fog: '#E8C0A8',
    ground: '#D4C4A0',
    accent: '#F0A060',
    light: '#FFE8D8',
    intensityDelta: 0.08,
    mix: 0.55,
  },
  cozy: {
    background: '#2A1018',
    fog: '#8B4050',
    ground: '#6B3A2A',
    accent: '#FF7956',
    light: '#FFB080',
    intensityDelta: 0.04,
    mix: 0.54,
  },
};

function parseMood(raw: unknown): SceneMood | undefined {
  const value = String(raw ?? '').trim() as SceneMood;
  return VALID_MOODS.has(value) ? value : undefined;
}

function parseDensity(raw: unknown): SceneDensity {
  const value = String(raw ?? '').trim() as SceneDensity;
  return VALID_DENSITIES.has(value) ? value : 'balanced';
}

function parseRole(raw: unknown): ScenePropRole {
  const value = String(raw ?? '').trim() as ScenePropRole;
  return VALID_ROLES.has(value) ? value : 'dressing';
}

function parsePropType(raw: unknown): PropType | undefined {
  const value = String(raw ?? '').trim();
  return VALID_PROP_TYPES.has(value) ? (value as PropType) : undefined;
}

function parsePaletteHint(raw: unknown): SceneBriefPaletteHint {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const hint: SceneBriefPaletteHint = {
    warmth: clampNumber(Number(obj.warmth ?? 0.5), 0, 1),
    saturation: clampNumber(Number(obj.saturation ?? 0.5), 0, 1),
    contrast: clampNumber(Number(obj.contrast ?? 0.5), 0, 1),
  };
  if (obj.accentBias !== undefined) {
    const bias = sanitizeHex(obj.accentBias, '');
    if (bias) hint.accentBias = bias;
  }
  return hint;
}

function parseKeyProps(raw: unknown): SceneBriefKeyProp[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<PropType>();
  const props: SceneBriefKeyProp[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const type = parsePropType(row.type);
    if (!type || seen.has(type)) continue;
    seen.add(type);

    const prop: SceneBriefKeyProp = {
      type,
      role: parseRole(row.role),
    };
    if (row.note !== undefined) {
      const note = String(row.note).trim().slice(0, 120);
      if (note) prop.note = note;
    }
    props.push(prop);
    if (props.length >= 5) break;
  }

  return props;
}

function parseTimeOfDayArc(raw: unknown): SceneBriefTimeOfDayArc | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const arc: SceneBriefTimeOfDayArc = {};

  for (const [key, value] of Object.entries(obj)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) continue;
    const tod = String(value ?? '').trim() as TimeOfDay;
    if (!VALID_TIME_OF_DAY.has(tod)) continue;
    arc[String(index)] = tod;
  }

  return Object.keys(arc).length > 0 ? arc : undefined;
}

function parseWeatherBias(raw: unknown): WeatherType | undefined {
  const value = String(raw ?? '').trim() as WeatherType;
  return VALID_WEATHER.has(value) ? value : undefined;
}

/**
 * Sanitize a raw scene brief. Returns undefined when mood is missing/invalid
 * or when no valid keyProps remain after filtering + dedupe.
 */
export function normalizeSceneBrief(raw: unknown): SceneBrief | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;

  const mood = parseMood(obj.mood);
  if (!mood) return undefined;

  const keyProps = parseKeyProps(obj.keyProps);
  if (keyProps.length < 1) return undefined;

  const brief: SceneBrief = {
    mood,
    paletteHint: parsePaletteHint(obj.paletteHint),
    keyProps,
    density: parseDensity(obj.density),
  };

  const timeOfDayArc = parseTimeOfDayArc(obj.timeOfDayArc);
  if (timeOfDayArc) brief.timeOfDayArc = timeOfDayArc;

  const weatherBias = parseWeatherBias(obj.weatherBias);
  if (weatherBias) brief.weatherBias = weatherBias;

  return brief;
}

// ── compile helpers (pure color / layout math) ─────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.round(clampNumber(n, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const u = clampNumber(t, 0, 1);
  return rgbToHex(ar + (br - ar) * u, ag + (bg - ag) * u, ab + (bb - ab) * u);
}

/** Pull chroma toward luminance. amount 0 = unchanged, 1 = full gray. */
function desaturateHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = clampNumber(amount, 0, 1);
  return rgbToHex(
    r + (lum - r) * t,
    g + (lum - g) * t,
    b + (lum - b) * t
  );
}

/** Adjust warmth (toward orange/blue), saturation, and contrast around mid-gray. */
function applyPaletteHint(hex: string, hint: SceneBriefPaletteHint): string {
  let [r, g, b] = hexToRgb(hex);

  // Warmth: push R up / B down when warm, inverse when cool
  const warmthDelta = (hint.warmth - 0.5) * 48;
  r += warmthDelta;
  b -= warmthDelta * 0.85;

  // Saturation toward/away from luminance
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const satScale = 0.35 + hint.saturation * 1.3;
  r = lum + (r - lum) * satScale;
  g = lum + (g - lum) * satScale;
  b = lum + (b - lum) * satScale;

  // Contrast around mid-gray
  const mid = 128;
  const contrastScale = 0.55 + hint.contrast * 0.9;
  r = mid + (r - mid) * contrastScale;
  g = mid + (g - mid) * contrastScale;
  b = mid + (b - mid) * contrastScale;

  return rgbToHex(r, g, b);
}

function rolePlacement(
  role: ScenePropRole,
  index: number,
  type: PropType
): EnvironmentObject {
  // Deterministic jitter from type string so the same brief always places the same way
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) | 0;
  const jitter = ((hash % 17) - 8) * 0.08;

  if (role === 'landmark') {
    return {
      type,
      x: clampNumber(jitter * 0.5 + (index === 0 ? 0 : index % 2 === 0 ? -0.6 : 0.6), -1.2, 1.2),
      z: clampNumber(-1.2 + jitter * 0.3, -2.2, -0.4),
      scale: clampNumber(1.15 + (Math.abs(hash) % 5) * 0.04, 1.05, 1.35),
    };
  }

  if (role === 'focus') {
    const side = index % 2 === 0 ? -1 : 1;
    return {
      type,
      x: clampNumber(side * (1.4 + (index % 3) * 0.45) + jitter, -3.5, 3.5),
      z: clampNumber(-1.5 + jitter * 0.4, -2.8, -0.2),
      scale: clampNumber(0.95 + (Math.abs(hash) % 4) * 0.05, 0.85, 1.2),
    };
  }

  // dressing — outer edges
  const side = index % 2 === 0 ? -1 : 1;
  return {
    type,
    x: clampNumber(side * (2.6 + (index % 4) * 0.35) + jitter, -4.5, 4.5),
    z: clampNumber(-2.0 + (index % 3) * 0.25 + jitter * 0.3, -3.5, 0.5),
    scale: clampNumber(0.8 + (Math.abs(hash) % 3) * 0.05, 0.7, 1.05),
  };
}

/**
 * Place only story-grounded keyProps. Preset biome objects are used for
 * position/scale reuse when the same type exists — never as density filler.
 */
function buildObjects(
  brief: SceneBrief,
  presetObjects: EnvironmentObject[],
  existingObjects?: EnvironmentObject[]
): EnvironmentObject[] {
  const target = DENSITY_TARGET[brief.density];
  const byType = new Map<string, EnvironmentObject>();

  // Prefer positions from an existing spec; fall back to preset layout hints
  for (const obj of existingObjects ?? []) {
    if (!byType.has(obj.type)) byType.set(obj.type, obj);
  }
  for (const obj of presetObjects) {
    if (!byType.has(obj.type)) byType.set(obj.type, obj);
  }

  const objects: EnvironmentObject[] = [];

  // Role order: landmarks first, then focus, then dressing
  const ordered = [...brief.keyProps].sort((a, b) => {
    const rank = (r: ScenePropRole) =>
      r === 'landmark' ? 0 : r === 'focus' ? 1 : 2;
    return rank(a.role) - rank(b.role);
  });

  ordered.forEach((keyProp, index) => {
    if (objects.length >= target.max) return;
    const reused = byType.get(keyProp.type);
    if (reused) {
      const placed = rolePlacement(keyProp.role, index, keyProp.type);
      objects.push({
        type: keyProp.type,
        x: keyProp.role === 'landmark' ? placed.x : (reused.x ?? placed.x),
        z: reused.z ?? placed.z,
        scale:
          keyProp.role === 'landmark'
            ? placed.scale
            : reused.scale ?? placed.scale,
      });
    } else {
      objects.push(rolePlacement(keyProp.role, index, keyProp.type));
    }
  });

  return objects;
}

/**
 * Compile a normalized scene brief onto a biome preset.
 * Pure: does not mutate inputs. Does not write sceneEvents (timeOfDayArc /
 * weatherBias are preserved on the brief for a later wiring step).
 *
 * When `existingSceneSpec` is provided, its palette is the starting canvas
 * instead of the raw preset colors; its objects seed placement reuse.
 */
export function compileSceneBrief(
  environment: EnvironmentType,
  brief: SceneBrief,
  existingSceneSpec?: StorySceneSpec | null
): StorySceneSpec {
  const preset = getEnvironmentPreset(environment);
  const mood = MOOD_TINT[brief.mood];

  const baseBackground = existingSceneSpec?.backgroundColor ?? preset.backgroundColor;
  const baseFog =
    existingSceneSpec?.fogColor ?? preset.fogColor ?? preset.backgroundColor;
  const baseGround =
    existingSceneSpec?.groundColor ?? preset.groundColor ?? '#C4A574';
  const baseAccent =
    existingSceneSpec?.accentColor ?? preset.accentColor ?? '#520e33';
  const baseLightColor =
    existingSceneSpec?.lighting.color ?? preset.lighting.color;
  const baseIntensity =
    existingSceneSpec?.lighting.intensity ?? preset.lighting.intensity;

  // 1) Mood tint over biome / existing palette
  let backgroundColor = mixHex(baseBackground, mood.background, mood.mix);
  let fogColor = mixHex(baseFog, mood.fog, mood.mix);
  let groundColor = mixHex(baseGround, mood.ground, mood.mix * 0.75);
  let accentColor = mixHex(baseAccent, mood.accent, mood.mix);
  let lightColor = mixHex(baseLightColor, mood.light, mood.mix * 0.85);
  let intensity = clampNumber(baseIntensity + mood.intensityDelta, 0.4, 1.2);

  // Tense: extra chroma drop so it reads cool crimson, not warm brown
  if (brief.mood === 'tense') {
    backgroundColor = desaturateHex(backgroundColor, 0.28);
    fogColor = desaturateHex(fogColor, 0.32);
    groundColor = desaturateHex(groundColor, 0.3);
    lightColor = desaturateHex(lightColor, 0.35);
    // Accent stays closer to c-red; lighter desat so it still pops
    accentColor = desaturateHex(accentColor, 0.12);
  }

  // 2) Palette hint adjustments
  backgroundColor = applyPaletteHint(backgroundColor, brief.paletteHint);
  fogColor = applyPaletteHint(fogColor, brief.paletteHint);
  groundColor = applyPaletteHint(groundColor, brief.paletteHint);
  accentColor = applyPaletteHint(accentColor, brief.paletteHint);
  lightColor = applyPaletteHint(lightColor, brief.paletteHint);

  if (brief.paletteHint.accentBias) {
    accentColor = mixHex(accentColor, brief.paletteHint.accentBias, 0.55);
  }

  // Contrast also nudges lighting intensity slightly
  intensity = clampNumber(
    intensity + (brief.paletteHint.contrast - 0.5) * 0.16,
    0.4,
    1.2
  );

  // 3) Props from keyProps + density fill
  const objects = buildObjects(
    brief,
    preset.objects,
    existingSceneSpec?.objects
  );

  return {
    backgroundColor,
    fogColor,
    groundColor,
    accentColor,
    lighting: {
      color: lightColor,
      intensity,
    },
    objects,
  };
}
