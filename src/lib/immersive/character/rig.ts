import type { CharacterType, GarmentStyle, HairStyle } from '../types';
import type { ResolvedCharacterConfig } from './config';

export type RigGeometryKind =
  | 'capsule'
  | 'sphere'
  | 'cylinder'
  | 'box'
  | 'torso'
  | 'torus'
  | 'sphereCap'
  | 'facePlane';

export interface RigMeshSpec {
  key: string;
  kind: RigGeometryKind;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  roughness?: number;
  args: number[];
  castShadow?: boolean;
}

export interface HumanoidRigSpec {
  meshes: RigMeshSpec[];
  armL: RigMeshSpec;
  armR: RigMeshSpec;
  headY: number;
  headRadius: number;
  facePlane: {
    position: [number, number, number];
    size: [number, number];
  };
  isElder: boolean;
}

export interface DogRigSpec {
  meshes: RigMeshSpec[];
  headY: number;
  mouthPosition: [number, number, number];
  mouthScale: [number, number, number];
  tail: {
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
    args: [number, number, number, number];
  };
}

export type RigSpec = { type: 'humanoid'; spec: HumanoidRigSpec } | { type: 'dog'; spec: DogRigSpec };

function torsoBandMeshes(
  height: number,
  colors: string[],
  centerY: number,
  garmentStyle: GarmentStyle
): RigMeshSpec[] {
  const topR = garmentStyle === 'dress' ? height * 0.22 : height * 0.24;
  const botR =
    garmentStyle === 'dress' ? height * 0.32 : garmentStyle === 'collar' ? height * 0.18 : height * 0.17;
  const torsoH = garmentStyle === 'dress' ? height * 0.4 : height * 0.34;

  if (colors.length <= 1) {
    return [
      {
        key: 'torso',
        kind: 'torso',
        position: [0, centerY - (garmentStyle === 'dress' ? height * 0.02 : 0), 0],
        color: colors[0],
        roughness: 0.7,
        args: [topR, botR, torsoH, 12],
        castShadow: true,
      },
    ];
  }

  const bandHeight = torsoH / colors.length;
  const baseY = centerY - torsoH / 2 + bandHeight / 2;

  return colors.map((color, i) => {
    const t = i / Math.max(1, colors.length - 1);
    const rTop = topR + (botR - topR) * (i / colors.length);
    const rBot = topR + (botR - topR) * ((i + 1) / colors.length);
    return {
      key: `torso-band-${i}`,
      kind: 'cylinder' as const,
      position: [0, baseY + i * bandHeight, 0] as [number, number, number],
      color,
      roughness: 0.7,
      args: [rTop - t * 0.004, rBot - t * 0.004, bandHeight * 1.02, 12],
      castShadow: true,
    };
  });
}

function hairMeshes(
  hairStyle: HairStyle,
  hairColor: string,
  headY: number,
  headRadius: number,
  hasHeadwrap: boolean
): RigMeshSpec[] {
  if (hasHeadwrap || hairStyle === 'wrap') {
    return [];
  }

  switch (hairStyle) {
    case 'braids':
      return [
        {
          key: 'hair-cap',
          kind: 'sphereCap',
          position: [0, headY + 0.04, -0.02],
          color: hairColor,
          roughness: 0.9,
          args: [headRadius * 1.02, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5],
        },
        {
          key: 'braid-l',
          kind: 'capsule',
          position: [-headRadius * 0.85, headY - headRadius * 0.15, -0.02],
          rotation: [0.15, 0, 0.35],
          color: hairColor,
          roughness: 0.85,
          args: [0.035, headRadius * 0.7, 4, 8],
        },
        {
          key: 'braid-r',
          kind: 'capsule',
          position: [headRadius * 0.85, headY - headRadius * 0.15, -0.02],
          rotation: [0.15, 0, -0.35],
          color: hairColor,
          roughness: 0.85,
          args: [0.035, headRadius * 0.7, 4, 8],
        },
      ];
    case 'bun':
      return [
        {
          key: 'hair-cap',
          kind: 'sphereCap',
          position: [0, headY + 0.03, -0.02],
          color: hairColor,
          roughness: 0.9,
          args: [headRadius * 1.02, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.48],
        },
        {
          key: 'hair-bun',
          kind: 'sphere',
          position: [0, headY + headRadius * 0.75, -headRadius * 0.35],
          color: hairColor,
          roughness: 0.88,
          args: [headRadius * 0.38, 12, 12],
        },
      ];
    case 'afro':
      return [
        {
          key: 'hair-afro',
          kind: 'sphere',
          position: [0, headY + headRadius * 0.25, -0.02],
          color: hairColor,
          roughness: 0.95,
          args: [headRadius * 1.35, 16, 16],
          castShadow: true,
        },
      ];
    case 'short':
    default:
      return [
        {
          key: 'hair',
          kind: 'sphereCap',
          position: [0, headY + 0.05, -0.02],
          color: hairColor,
          roughness: 0.9,
          args: [headRadius * 1.03, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55],
        },
      ];
  }
}

function garmentAccentMeshes(
  garmentStyle: GarmentStyle,
  accentColor: string,
  height: number,
  garmentColors: string[]
): RigMeshSpec[] {
  const meshes: RigMeshSpec[] = [];

  if (garmentStyle === 'sash' || garmentStyle === 'tunic') {
    meshes.push({
      key: 'sash',
      kind: 'box',
      position: [0, height * 0.48, height * 0.12],
      color: accentColor,
      roughness: 0.55,
      args: [height * 0.44, height * 0.1, 0.04],
    });
  }

  if (garmentStyle === 'collar') {
    meshes.push({
      key: 'collar',
      kind: 'torus',
      position: [0, height * 0.72, 0.04],
      rotation: [Math.PI / 2.2, 0, 0],
      color: accentColor,
      roughness: 0.45,
      args: [height * 0.1, 0.018, 10, 20],
    });
    meshes.push({
      key: 'collar-front',
      kind: 'box',
      position: [0, height * 0.68, height * 0.1],
      color: accentColor,
      roughness: 0.5,
      args: [height * 0.12, height * 0.04, 0.03],
    });
  }

  if (garmentStyle === 'dress') {
    meshes.push({
      key: 'dress-hem',
      kind: 'cylinder',
      position: [0, height * 0.28, 0],
      color: garmentColors[garmentColors.length - 1] ?? accentColor,
      roughness: 0.75,
      args: [height * 0.34, height * 0.36, height * 0.08, 14],
      castShadow: true,
    });
  }

  return meshes;
}

function accessoryMeshes(
  config: ResolvedCharacterConfig,
  headY: number,
  height: number,
  forceHeadwrap: boolean
): RigMeshSpec[] {
  const meshes: RigMeshSpec[] = [];
  const showHeadwrap =
    forceHeadwrap ||
    config.hairStyle === 'wrap' ||
    config.accessories.includes('headwrap');

  if (showHeadwrap) {
    meshes.push({
      key: 'accessory-headwrap',
      kind: 'cylinder',
      position: [0, headY + height * 0.04, -0.01],
      color: config.accentColor,
      roughness: 0.85,
      args: [height * 0.19, height * 0.19, height * 0.07, 14],
      castShadow: false,
    });
    meshes.push({
      key: 'accessory-headwrap-top',
      kind: 'sphereCap',
      position: [0, headY + height * 0.08, -0.02],
      color: config.accentColor,
      roughness: 0.88,
      args: [height * 0.17, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.45],
    });
  }

  if (config.accessories.includes('necklace')) {
    meshes.push({
      key: 'accessory-necklace',
      kind: 'torus',
      position: [0, height * 0.74, 0.06],
      rotation: [Math.PI / 2, 0, 0],
      color: config.accentColor,
      roughness: 0.35,
      args: [0.09, 0.012, 10, 20],
      castShadow: false,
    });
  }

  return meshes;
}

/** Build connected humanoid / dog geometry specs from character config */
export function buildRig(
  characterType: CharacterType,
  config: ResolvedCharacterConfig
): RigSpec {
  const { height, skinColor, garmentColors, accentColor, hairStyle, hairColor, garmentStyle, faceShape } =
    config;
  const isElder = characterType === 'grandma' || characterType === 'grandpa' || faceShape === 'elder';

  if (characterType === 'dog') {
    const headY = height * 0.55;
    return {
      type: 'dog',
      spec: {
        headY,
        mouthPosition: [0, headY - 0.04, height * 0.28],
        mouthScale: [0.1, 0.12, 0.06],
        tail: {
          position: [0, height * 0.35, -height * 0.28],
          rotation: [0.6, 0, 0],
          color: accentColor,
          args: [height * 0.05, height * 0.22, 4, 8],
        },
        meshes: [
          {
            key: 'body',
            kind: 'capsule',
            position: [0, height * 0.25, 0],
            color: skinColor,
            roughness: 0.65,
            args: [height * 0.22, height * 0.45, 8, 16],
            castShadow: true,
          },
          {
            key: 'head',
            kind: 'sphere',
            position: [0, headY, height * 0.12],
            color: skinColor,
            roughness: 0.6,
            args: [height * 0.22, 16, 16],
            castShadow: true,
          },
          {
            key: 'ear-l',
            kind: 'sphere',
            position: [-height * 0.16, headY + height * 0.12, height * 0.08],
            color: accentColor,
            roughness: 0.7,
            args: [height * 0.08, 10, 10],
          },
          {
            key: 'ear-r',
            kind: 'sphere',
            position: [height * 0.16, headY + height * 0.12, height * 0.08],
            color: accentColor,
            roughness: 0.7,
            args: [height * 0.08, 10, 10],
          },
        ],
      },
    };
  }

  const torsoCenterY = height * 0.52;
  const headRadius =
    faceShape === 'elder' ? height * 0.175 : faceShape === 'oval' ? height * 0.16 : height * 0.17;
  const headY = height * 0.88;
  const shoulderInset = height * (garmentStyle === 'collar' ? 0.19 : 0.17);
  const armLength = height * 0.24;
  const forceHeadwrap = hairStyle === 'wrap' || characterType === 'grandma';

  const meshes: RigMeshSpec[] = [
    {
      key: 'leg-l',
      kind: 'capsule',
      position: [-0.12, height * 0.24, 0],
      color: garmentColors[0],
      roughness: 0.75,
      args: [0.07, height * 0.3, 6, 12],
      castShadow: true,
    },
    {
      key: 'leg-r',
      kind: 'capsule',
      position: [0.12, height * 0.24, 0],
      color: garmentColors[0],
      roughness: 0.75,
      args: [0.07, height * 0.3, 6, 12],
      castShadow: true,
    },
    ...torsoBandMeshes(height, garmentColors, torsoCenterY, garmentStyle),
    ...garmentAccentMeshes(garmentStyle, accentColor, height, garmentColors),
    {
      key: 'shoulder-l',
      kind: 'sphere',
      position: [-shoulderInset * 0.85, height * 0.62, 0],
      color: garmentColors[0],
      roughness: 0.72,
      args: [height * 0.09, 10, 10],
      castShadow: true,
    },
    {
      key: 'shoulder-r',
      kind: 'sphere',
      position: [shoulderInset * 0.85, height * 0.62, 0],
      color: garmentColors[0],
      roughness: 0.72,
      args: [height * 0.09, 10, 10],
      castShadow: true,
    },
    {
      key: 'neck',
      kind: 'cylinder',
      position: [0, height * 0.735, 0.02],
      color: skinColor,
      roughness: 0.6,
      args: [0.065, 0.075, height * 0.14, 10],
      castShadow: true,
    },
    {
      key: 'head',
      kind: 'sphere',
      position: [0, headY, 0.04],
      scale: faceShape === 'oval' ? [0.92, 1.08, 0.95] : faceShape === 'elder' ? [1.05, 0.95, 1] : [1, 1, 1],
      color: skinColor,
      roughness: 0.55,
      args: [headRadius, 20, 20],
      castShadow: true,
    },
    ...hairMeshes(hairStyle, hairColor, headY, headRadius, forceHeadwrap),
    ...accessoryMeshes(config, headY, height, forceHeadwrap),
  ];

  const armL: RigMeshSpec = {
    key: 'arm-l',
    kind: 'capsule',
    position: [-shoulderInset, height * 0.58, 0.02],
    rotation: [0, 0, 0.55],
    color: skinColor,
    roughness: 0.65,
    args: [0.055, armLength, 6, 10],
    castShadow: true,
  };
  const armR: RigMeshSpec = {
    key: 'arm-r',
    kind: 'capsule',
    position: [shoulderInset, height * 0.58, 0.02],
    rotation: [0, 0, -0.55],
    color: skinColor,
    roughness: 0.65,
    args: [0.055, armLength, 6, 10],
    castShadow: true,
  };

  const faceWidth =
    faceShape === 'oval' ? headRadius * 1.2 : faceShape === 'elder' ? headRadius * 1.45 : headRadius * 1.35;
  const faceHeight =
    faceShape === 'oval' ? headRadius * 1.55 : faceShape === 'elder' ? headRadius * 1.35 : headRadius * 1.45;
  const headFrontZ = 0.04 + headRadius;

  return {
    type: 'humanoid',
    spec: {
      meshes,
      armL,
      armR,
      headY,
      headRadius,
      isElder,
      facePlane: {
        position: [0, headY, headFrontZ + headRadius * 0.04],
        size: [faceWidth, faceHeight],
      },
    },
  };
}
