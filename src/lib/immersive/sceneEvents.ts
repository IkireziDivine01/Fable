import {
  clampNumber,
  parseEnvironmentObjects,
  sanitizeHex,
  VALID_PROP_TYPES,
} from './sceneSpec';
import { getEnvironmentPreset } from './presets';
import { deriveGestureFromText, parseReactionGesture } from './character/gestures';
import { applyTimeOfDayPalette, parseTimeOfDay } from './timeOfDay';
import type {
  EnvironmentObject,
  EnvironmentType,
  ReactionGesture,
  SceneEvent,
  StoryHotspot,
  StorySceneSpec,
  TimeOfDay,
  WeatherType,
} from './types';

const VALID_WEATHER = new Set<WeatherType>(['clear', 'rain', 'fireflies', 'mist']);

const PROP_HOTSPOT_COPY: Record<
  string,
  { title: string; body: string; titleRw: string; bodyRw: string }
> = {
  fire: {
    title: 'The fire',
    body: 'Families gather around the fire to share stories, warmth, and wisdom across generations.',
    titleRw: 'Umuriro',
    bodyRw: 'Imiryango yicara hafi y’umuriro basangira inkuru, ubushyuhe, n’ubwenge.',
  },
  hut: {
    title: 'The home',
    body: 'A home holds family memories — cooking, greetings, and quiet evenings together.',
    titleRw: 'Inzu',
    bodyRw: 'Inzu ifata ibyibuka dufitanye — guteka, gusuhuza, n’amasaha y’ijoro.',
  },
  tree: {
    title: 'The tree',
    body: 'Trees shade play, mark paths, and remind us to care for the land we share.',
    titleRw: 'Igiti',
    bodyRw: 'Ibiti bitanga igicucu, byerekana inzira, kandi bitwibutsa kubungabunga isi.',
  },
  stall: {
    title: 'The market stall',
    body: 'At the market we trade goods, greet neighbors, and practice ubuntu in everyday life.',
    titleRw: 'Iduka ry’isoko',
    bodyRw: 'Ku isoko tugurisha, dusuhuza abaturanyi, kandi dukora ubuntu mu buzima.',
  },
  board: {
    title: 'The learning board',
    body: 'Learning together helps every child grow curious, brave, and kind.',
    titleRw: 'Ikibaho cy’amasomo',
    bodyRw: 'Kwiga hamwe bifasha buri mwana gukura afite amatsiko, ubutwari, n’ubuntu.',
  },
  rock: {
    title: 'The resting rock',
    body: 'A quiet place to sit, listen, and notice the world around you.',
    titleRw: 'Ibuye',
    bodyRw: 'Ahantu ho gutuza, kumva, no kureba isi ikikuje.',
  },
  flower: {
    title: 'Wild flowers',
    body: 'Small beauties along the path teach us to notice joy in simple things.',
    titleRw: 'Indabo',
    bodyRw: 'Ubwiza buto ku nzira butwigisha kubona ibyishimo mu bintu byoroheje.',
  },
  bench: {
    title: 'The bench',
    body: 'Elders and children sit side by side — the best place for a story to begin.',
    titleRw: 'Intebe',
    bodyRw: 'Abakuru n’abana bicara hamwe — ahantu heza inkuru yatangirira.',
  },
  banana_tree: {
    title: 'Banana tree',
    body: 'Banana trees feed families and shade courtyards — a living gift of the land.',
    titleRw: 'Umuzuzu',
    bodyRw: 'Imizuzu ifasha imiryango kurya no kubona igicucu — impano y’isi.',
  },
  path: {
    title: 'The path',
    body: 'Paths connect homes, markets, and schools — every journey begins with a step.',
    titleRw: 'Inzira',
    bodyRw: 'Inzira zihuza amazu, amasoko, n’amashuri — urugendo rutangira n’intambwe.',
  },
  water_jug: {
    title: 'Water jug',
    body: 'Fetching water is care for the family — heavy jugs, shared work, and gratitude.',
    titleRw: 'Ikibindi',
    bodyRw: 'Gushaka amazi ni ukwitaho umuryango — ibibindi biremereye, akazi gasangiwe.',
  },
  drum: {
    title: 'The drum',
    body: 'Drums call people together for celebration, dance, and stories that move the heart.',
    titleRw: 'Ingoma',
    bodyRw: 'Ingoma zihamagara abantu mu munezero, mu byinshi, n’inkuru zishimisha umutima.',
  },
  goat: {
    title: 'The goat',
    body: 'Goats graze near homes and remind us that animals are part of village life.',
    titleRw: 'Ihene',
    bodyRw: 'Ihene zirisha hafi y’amazu kandi zitwibutsa ko inyamaswa ari mu buzima bw’umudugudu.',
  },
  millet_field: {
    title: 'Millet field',
    body: 'Millet grows under the sun — food from careful hands and patient seasons.',
    titleRw: 'Umwuca w’uburo',
    bodyRw: 'Uburo bukura ku zuba — ibiryo biva mu ntoki zihanganye n’ibihe.',
  },
};

function parseLightingShift(
  raw: unknown,
  fallbackColor: string,
  fallbackIntensity: number
): SceneEvent['lightingShift'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    color: sanitizeHex(obj.color ?? obj.lightingColor, fallbackColor),
    intensity: clampNumber(
      Number(obj.intensity ?? obj.lightingIntensity ?? fallbackIntensity),
      0.35,
      1.25
    ),
  };
}

export function normalizeSceneEvent(
  raw: unknown,
  environment: EnvironmentType
): SceneEvent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const base = getEnvironmentPreset(environment);

  const event: SceneEvent = {};

  const addObjects = parseEnvironmentObjects(obj.addObjects, { maxCount: 4 });
  if (addObjects.length > 0) event.addObjects = addObjects;

  if (Array.isArray(obj.removeTypes)) {
    const removeTypes = obj.removeTypes
      .map((t) => String(t).trim())
      .filter((t) => VALID_PROP_TYPES.has(t));
    if (removeTypes.length > 0) event.removeTypes = removeTypes;
  }

  const lightingRaw =
    obj.lightingShift && typeof obj.lightingShift === 'object'
      ? obj.lightingShift
      : obj.lighting && typeof obj.lighting === 'object'
        ? obj.lighting
        : obj.lightingColor !== undefined || obj.lightingIntensity !== undefined
          ? {
              color: obj.lightingColor,
              intensity: obj.lightingIntensity,
            }
          : null;
  const lighting = parseLightingShift(
    lightingRaw,
    base.lighting.color,
    base.lighting.intensity
  );
  if (lighting) event.lightingShift = lighting;

  const weatherRaw = String(obj.weather ?? '').trim() as WeatherType;
  if (VALID_WEATHER.has(weatherRaw)) event.weather = weatherRaw;

  const timeOfDay = parseTimeOfDay(obj.timeOfDay);
  if (timeOfDay) event.timeOfDay = timeOfDay;

  const gesture = parseReactionGesture(obj.gesture);
  if (gesture) event.gesture = gesture;

  if (obj.backgroundColor !== undefined) {
    event.backgroundColor = sanitizeHex(obj.backgroundColor, base.backgroundColor);
  }
  if (obj.fogColor !== undefined) {
    event.fogColor = sanitizeHex(obj.fogColor, base.fogColor ?? base.backgroundColor);
  }
  if (obj.groundColor !== undefined) {
    event.groundColor = sanitizeHex(obj.groundColor, base.groundColor ?? '#C4A574');
  }
  if (obj.accentColor !== undefined) {
    event.accentColor = sanitizeHex(obj.accentColor, base.accentColor ?? '#520e33');
  }

  return Object.keys(event).length > 0 ? event : undefined;
}

export function normalizeSceneEvents(
  raw: unknown,
  environment: EnvironmentType
): Record<string, SceneEvent> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const events: Record<string, SceneEvent> = {};

  for (const [key, value] of Object.entries(obj)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) continue;
    const event = normalizeSceneEvent(value, environment);
    if (event) events[String(index)] = event;
  }

  return Object.keys(events).length > 0 ? events : undefined;
}

export function normalizeHotspots(raw: unknown): StoryHotspot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const hotspots: StoryHotspot[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const propType = String(row.propType ?? row.type ?? '').trim();
    if (!VALID_PROP_TYPES.has(propType)) continue;
    const title = String(row.title ?? '').trim();
    const body = String(row.body ?? row.description ?? '').trim();
    if (!title || !body) continue;

    const hotspot: StoryHotspot = {
      id: String(row.id ?? `${propType}-${hotspots.length}`),
      propType,
      title: title.slice(0, 48),
      body: body.slice(0, 220),
    };
    if (row.propIndex !== undefined && Number.isFinite(Number(row.propIndex))) {
      hotspot.propIndex = Math.max(0, Math.floor(Number(row.propIndex)));
    }
    if (row.titleRw) hotspot.titleRw = String(row.titleRw).trim().slice(0, 48);
    if (row.bodyRw) hotspot.bodyRw = String(row.bodyRw).trim().slice(0, 220);
    hotspots.push(hotspot);
    if (hotspots.length >= 6) break;
  }

  return hotspots.length > 0 ? hotspots : undefined;
}

export interface ResolvedSceneState {
  sceneSpec: StorySceneSpec | null;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  /** Gesture only for the current sentence (not sticky) */
  gesture: ReactionGesture | null;
}

/**
 * Merges base sceneSpec with all sticky events for sentence indices 0..sentenceIndex.
 */
export function resolveSceneAtSentence(
  environment: EnvironmentType,
  baseSceneSpec: StorySceneSpec | null | undefined,
  sceneEvents: Record<string, SceneEvent> | null | undefined,
  sentenceIndex: number
): ResolvedSceneState {
  const base = getEnvironmentPreset(environment);
  let sceneSpec: StorySceneSpec = baseSceneSpec
    ? { ...baseSceneSpec, objects: [...baseSceneSpec.objects], lighting: { ...baseSceneSpec.lighting } }
    : {
        backgroundColor: base.backgroundColor,
        fogColor: base.fogColor ?? base.backgroundColor,
        groundColor: base.groundColor ?? '#C4A574',
        accentColor: base.accentColor ?? '#520e33',
        lighting: { ...base.lighting },
        objects: [...base.objects],
      };

  let weather: WeatherType = 'clear';
  let timeOfDay: TimeOfDay = 'midday';
  if (!sceneEvents) {
    return { sceneSpec, weather, timeOfDay, gesture: null };
  }

  const indices = Object.keys(sceneEvents)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= sentenceIndex)
    .sort((a, b) => a - b);

  for (const index of indices) {
    const event = sceneEvents[String(index)];
    if (!event) continue;

    if (event.removeTypes?.length) {
      const remove = new Set(event.removeTypes);
      sceneSpec.objects = sceneSpec.objects.filter((o) => !remove.has(o.type));
    }
    if (event.addObjects?.length) {
      sceneSpec.objects = [...sceneSpec.objects, ...event.addObjects].slice(0, 10);
    }
    if (event.timeOfDay) {
      timeOfDay = event.timeOfDay;
      applyTimeOfDayPalette(sceneSpec, timeOfDay);
    }
    if (event.lightingShift) {
      sceneSpec.lighting = { ...event.lightingShift };
    }
    if (event.backgroundColor) sceneSpec.backgroundColor = event.backgroundColor;
    if (event.fogColor) sceneSpec.fogColor = event.fogColor;
    if (event.groundColor) sceneSpec.groundColor = event.groundColor;
    if (event.accentColor) sceneSpec.accentColor = event.accentColor;
    if (event.weather) weather = event.weather;
  }

  const current = sceneEvents[String(sentenceIndex)];
  const gesture = current?.gesture ?? null;

  return { sceneSpec, weather, timeOfDay, gesture };
}

/** Build tap targets from props when AI did not supply hotspots. */
export function buildDefaultHotspots(objects: EnvironmentObject[]): StoryHotspot[] {
  const seen = new Map<string, number>();
  const hotspots: StoryHotspot[] = [];

  for (const obj of objects) {
    const copy = PROP_HOTSPOT_COPY[obj.type];
    if (!copy) continue;
    const typeIndex = seen.get(obj.type) ?? 0;
    seen.set(obj.type, typeIndex + 1);
    // One hotspot per prop type (first instance) to keep UI calm
    if (typeIndex > 0) continue;
    hotspots.push({
      id: `default-${obj.type}`,
      propType: obj.type,
      propIndex: 0,
      title: copy.title,
      body: copy.body,
      titleRw: copy.titleRw,
      bodyRw: copy.bodyRw,
    });
    if (hotspots.length >= 4) break;
  }

  return hotspots;
}

export function mergeHotspots(
  custom: StoryHotspot[] | undefined,
  objects: EnvironmentObject[]
): StoryHotspot[] {
  if (custom && custom.length > 0) return custom;
  return buildDefaultHotspots(objects);
}

/**
 * Heuristic scene beats for legacy stories without AI sceneEvents.
 * Caps at a few moments so the scene stays readable.
 */
export function deriveSceneEventsFromSentences(
  sentences: Array<{ sentence_text?: string; text?: string } | string>,
  environment: EnvironmentType
): Record<string, SceneEvent> {
  const base = getEnvironmentPreset(environment);
  const events: Record<string, SceneEvent> = {};
  let count = 0;

  for (let i = 0; i < sentences.length; i++) {
    if (count >= 3) break;
    const raw = sentences[i];
    const text =
      typeof raw === 'string'
        ? raw
        : String(raw.sentence_text ?? raw.text ?? '').toLowerCase();
    if (!text) continue;

    let event: SceneEvent | undefined;

    if (/\b(rain|storm|imvura|uruzuba)\b/.test(text)) {
      event = {
        weather: 'rain',
        lightingShift: { color: '#A8C5D4', intensity: 0.65 },
        fogColor: sanitizeHex(null, '#4A6670'),
      };
    } else if (/\b(night|dark|stars|ijoro|moon)\b/.test(text)) {
      event = {
        timeOfDay: 'night',
        weather: 'fireflies',
      };
    } else if (/\b(evening|dusk|sunset)\b/.test(text)) {
      event = {
        timeOfDay: 'dusk',
      };
    } else if (/\b(mist|fog|foggy|cloud)\b/.test(text)) {
      event = {
        weather: 'mist',
        lightingShift: { color: '#D4D8C8', intensity: 0.7 },
        fogColor: sanitizeHex(null, '#9AA894'),
      };
    } else if (/\b(fire|warm|umuriro|hearth|glow)\b/.test(text) && environment === 'home') {
      event = {
        lightingShift: { color: '#FF9A6B', intensity: 1.05 },
        accentColor: '#FF7956',
      };
    } else if (/\b(morning|dawn|sunrise)\b/.test(text)) {
      event = {
        timeOfDay: 'dawn',
        weather: 'clear',
      };
    } else if (/\b(midday|noon|bright|sun)\b/.test(text)) {
      event = {
        timeOfDay: 'midday',
        weather: 'clear',
        lightingShift: {
          color: sanitizeHex(null, '#FFE8C8'),
          intensity: Math.min(1.15, base.lighting.intensity + 0.15),
        },
      };
    }

    const gesture = deriveGestureFromText(text);
    if (event) {
      if (gesture) event.gesture = gesture;
      events[String(i)] = event;
      count += 1;
    } else if (gesture) {
      events[String(i)] = { gesture };
    }
  }

  return events;
}
