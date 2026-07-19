import type { CharacterType, PersonalityPose } from '../types';

export interface IdleMotionParams {
  bobFreq: number;
  bobAmp: number;
  swayFreq: number;
  swayAmp: number;
  leanX: number;
  leanZ: number;
  tailWagFreq: number;
  tailWagAmp: number;
}

const TYPE_BASE: Record<CharacterType, Omit<IdleMotionParams, 'leanX' | 'leanZ'>> = {
  boy: {
    bobFreq: 2.1,
    bobAmp: 0.018,
    swayFreq: 1.2,
    swayAmp: 0.055,
    tailWagFreq: 0,
    tailWagAmp: 0,
  },
  girl: {
    bobFreq: 2.0,
    bobAmp: 0.016,
    swayFreq: 1.15,
    swayAmp: 0.05,
    tailWagFreq: 0,
    tailWagAmp: 0,
  },
  grandma: {
    bobFreq: 0.85,
    bobAmp: 0.006,
    swayFreq: 0.55,
    swayAmp: 0.02,
    tailWagFreq: 0,
    tailWagAmp: 0,
  },
  grandpa: {
    bobFreq: 0.8,
    bobAmp: 0.005,
    swayFreq: 0.5,
    swayAmp: 0.018,
    tailWagFreq: 0,
    tailWagAmp: 0,
  },
  teacher: {
    bobFreq: 0.95,
    bobAmp: 0.007,
    swayFreq: 0.65,
    swayAmp: 0.022,
    tailWagFreq: 0,
    tailWagAmp: 0,
  },
  dog: {
    bobFreq: 2.4,
    bobAmp: 0.02,
    swayFreq: 1.6,
    swayAmp: 0.06,
    tailWagFreq: 7.5,
    tailWagAmp: 0.45,
  },
};

const POSE_LEAN: Record<PersonalityPose, { leanX: number; leanZ: number; ampScale: number }> = {
  shy: { leanX: 0, leanZ: -0.06, ampScale: 0.7 },
  confident: { leanX: 0, leanZ: 0.02, ampScale: 1 },
  wise: { leanX: 0.02, leanZ: 0.08, ampScale: 0.75 },
  playful: { leanX: 0, leanZ: 0, ampScale: 1.25 },
};

export function getIdleMotionParams(
  characterType: CharacterType,
  personalityPose: PersonalityPose
): IdleMotionParams {
  const base = TYPE_BASE[characterType];
  const pose = POSE_LEAN[personalityPose];
  return {
    bobFreq: base.bobFreq * (personalityPose === 'playful' ? 1.15 : 1),
    bobAmp: base.bobAmp * pose.ampScale,
    swayFreq: base.swayFreq,
    swayAmp: base.swayAmp * pose.ampScale,
    leanX: pose.leanX,
    leanZ: pose.leanZ,
    tailWagFreq: base.tailWagFreq,
    tailWagAmp: base.tailWagAmp * (personalityPose === 'playful' ? 1.2 : 1),
  };
}

export function sampleIdleMotion(
  params: IdleMotionParams,
  t: number,
  seed: number
): { y: number; rotY: number; rotX: number; rotZ: number; tailRotZ: number } {
  const phase = seed;
  return {
    y: Math.sin(t * params.bobFreq + phase) * params.bobAmp,
    rotY: Math.sin(t * params.swayFreq + phase) * params.swayAmp,
    rotX: params.leanZ + Math.sin(t * 0.4 + phase) * 0.01,
    rotZ: params.leanX,
    tailRotZ: Math.sin(t * params.tailWagFreq + phase) * params.tailWagAmp,
  };
}
