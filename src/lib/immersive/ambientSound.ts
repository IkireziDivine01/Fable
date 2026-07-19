import type { EnvironmentType, TimeOfDay, WeatherType } from './types';

type AmbientHandle = {
  setEnvironment: (environment: EnvironmentType) => void;
  setWeather: (weather: WeatherType) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setMuted: (muted: boolean) => void;
  stop: () => void;
};

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Soft procedural ambience keyed by environment + weather.
 * Stays well under narration volume; no external audio assets required.
 */
export function createAmbientSoundscape(): AmbientHandle {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let bedGain: GainNode | null = null;
  let weatherGain: GainNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let rainSource: AudioBufferSourceNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let chirpTimer: number | null = null;
  let environment: EnvironmentType = 'village';
  let weather: WeatherType = 'clear';
  let timeOfDay: TimeOfDay = 'midday';
  let muted = false;
  let running = false;

  const envBedGain: Record<EnvironmentType, number> = {
    forest: 0.07,
    home: 0.055,
    village: 0.05,
    market: 0.065,
    school: 0.04,
  };

  const envFilterHz: Record<EnvironmentType, number> = {
    forest: 900,
    home: 480,
    village: 700,
    market: 1200,
    school: 550,
  };

  function ensureGraph() {
    if (ctx && master) return;
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    bedGain = ctx.createGain();
    bedGain.connect(master);

    weatherGain = ctx.createGain();
    weatherGain.gain.value = 0;
    weatherGain.connect(master);

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    filter.connect(bedGain);

    const buffer = createNoiseBuffer(ctx, 2.5);
    noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    noiseSource.connect(filter);
    noiseSource.start();

    rainSource = ctx.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.6;
    rainSource.connect(rainFilter);
    rainFilter.connect(weatherGain);
    rainSource.start();

    running = true;
    applyParams();
    scheduleChirps();
  }

  function applyParams() {
    if (!ctx || !bedGain || !weatherGain || !filter || !master) return;
    const now = ctx.currentTime;
    const todMul =
      timeOfDay === 'night' ? 0.55 : timeOfDay === 'dusk' ? 0.75 : timeOfDay === 'dawn' ? 0.85 : 1;
    const bed = muted ? 0 : (envBedGain[environment] ?? 0.05) * todMul;
    bedGain.gain.cancelScheduledValues(now);
    bedGain.gain.linearRampToValueAtTime(bed, now + 0.6);
    const filterHz =
      (envFilterHz[environment] ?? 700) *
      (timeOfDay === 'night' ? 0.7 : timeOfDay === 'dusk' ? 0.85 : 1);
    filter.frequency.linearRampToValueAtTime(filterHz, now + 0.8);

    let weatherLevel = 0;
    if (!muted) {
      if (weather === 'rain') weatherLevel = 0.045;
      else if (weather === 'mist') weatherLevel = 0.02;
      else if (weather === 'fireflies') weatherLevel = 0.008;
    }
    weatherGain.gain.cancelScheduledValues(now);
    weatherGain.gain.linearRampToValueAtTime(weatherLevel, now + 0.5);
    master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.25);
  }

  function scheduleChirps() {
    if (chirpTimer != null) {
      window.clearTimeout(chirpTimer);
      chirpTimer = null;
    }
    if (!running || !ctx || !master || muted) return;

    const delay = 2200 + Math.random() * 4200;
    chirpTimer = window.setTimeout(() => {
      chirpTimer = null;
      if (!running || !ctx || !master || muted) return;

      if (environment === 'forest' || environment === 'village') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const f = 1400 + Math.random() * 900;
        osc.frequency.value = f;
        g.gain.value = 0.0001;
        osc.connect(g);
        g.connect(master);
        const t = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.018, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.frequency.exponentialRampToValueAtTime(f * 1.15, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.22);
      } else if (environment === 'home' && weather !== 'rain') {
        // Soft fire-like crackle blip
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 90 + Math.random() * 40;
        g.gain.value = 0.0001;
        osc.connect(g);
        g.connect(master);
        const t = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.012, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.1);
      }

      scheduleChirps();
    }, delay);
  }

  return {
    setEnvironment(next) {
      environment = next;
      ensureGraph();
      void ctx?.resume();
      applyParams();
      scheduleChirps();
    },
    setWeather(next) {
      weather = next;
      ensureGraph();
      void ctx?.resume();
      applyParams();
    },
    setTimeOfDay(next) {
      timeOfDay = next;
      ensureGraph();
      void ctx?.resume();
      applyParams();
    },
    setMuted(next) {
      muted = next;
      applyParams();
      if (!muted) scheduleChirps();
      else if (chirpTimer != null) {
        window.clearTimeout(chirpTimer);
        chirpTimer = null;
      }
    },
    stop() {
      running = false;
      if (chirpTimer != null) {
        window.clearTimeout(chirpTimer);
        chirpTimer = null;
      }
      try {
        noiseSource?.stop();
        rainSource?.stop();
      } catch {
        /* already stopped */
      }
      noiseSource = null;
      rainSource = null;
      void ctx?.close();
      ctx = null;
      master = null;
      bedGain = null;
      weatherGain = null;
      filter = null;
    },
  };
}
