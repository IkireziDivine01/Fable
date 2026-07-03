import type { CharacterType } from '../types';
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
}

export type RigSpec = { type: 'humanoid'; spec: HumanoidRigSpec } | { type: 'dog'; spec: DogRigSpec };

function torsoBandMeshes(
  height: number,
  colors: string[],
  centerY: number
): RigMeshSpec[] {
  if (colors.length <= 1) {
    return [
      {
        key: 'torso',
        kind: 'torso',
        position: [0, centerY, 0],
        color: colors[0],
        roughness: 0.7,
        args: [height * 0.24, height * 0.17, height * 0.34, 12],
        castShadow: true,
      },
    ];
  }

  const bandHeight = (height * 0.34) / colors.length;
  const baseY = centerY - height * 0.17 + bandHeight / 2;

  return colors.map((color, i) => ({
    key: `torso-band-${i}`,
    kind: 'cylinder',
    position: [0, baseY + i * bandHeight, 0],
    color,
    roughness: 0.7,
    args: [
      height * 0.24 - i * 0.008,
      height * 0.24 - (i + 1) * 0.008,
      bandHeight * 1.02,
      12,
    ],
    castShadow: true,
  }));
}

function accessoryMeshes(
  config: ResolvedCharacterConfig,
  headY: number,
  height: number
): RigMeshSpec[] {
  const meshes: RigMeshSpec[] = [];

  for (const accessory of config.accessories) {
    if (accessory === 'headwrap') {
      meshes.push({
        key: 'accessory-headwrap',
        kind: 'cylinder',
        position: [0, headY + height * 0.04, -0.01],
        color: config.accentColor,
        roughness: 0.85,
        args: [height * 0.19, height * 0.19, height * 0.07, 14],
        castShadow: false,
      });
    }
    if (accessory === 'necklace') {
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
  }

  return meshes;
}

/** Build connected humanoid / dog geometry specs from character config */
export function buildRig(
  characterType: CharacterType,
  config: ResolvedCharacterConfig
): RigSpec {
  const { height, skinColor, garmentColors, accentColor } = config;
  const isElder = characterType === 'grandma' || characterType === 'grandpa';

  if (characterType === 'dog') {
    const headY = height * 0.55;
    return {
      type: 'dog',
      spec: {
        headY,
        mouthPosition: [0, headY - 0.04, height * 0.28],
        mouthScale: [0.1, 0.12, 0.06],
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
        ],
      },
    };
  }

  const torsoCenterY = height * 0.52;
  const headRadius = height * 0.17;
  const headY = height * 0.88;
  const shoulderInset = height * 0.17;
  const armLength = height * 0.24;

  const meshes: RigMeshSpec[] = [
    // Legs — overlap slightly into torso base
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
    ...torsoBandMeshes(height, garmentColors, torsoCenterY),
    {
      key: 'sash',
      kind: 'box',
      position: [0, height * 0.48, height * 0.12],
      color: accentColor,
      roughness: 0.55,
      args: [height * 0.44, height * 0.1, 0.04],
    },
    // Arms — origin inside shoulder volume, extending outward
    {
      key: 'arm-l',
      kind: 'capsule',
      position: [-shoulderInset, height * 0.58, 0.02],
      rotation: [0, 0, 0.55],
      color: skinColor,
      roughness: 0.65,
      args: [0.055, armLength, 6, 10],
      castShadow: true,
    },
    {
      key: 'arm-r',
      kind: 'capsule',
      position: [shoulderInset, height * 0.58, 0.02],
      rotation: [0, 0, -0.55],
      color: skinColor,
      roughness: 0.65,
      args: [0.055, armLength, 6, 10],
      castShadow: true,
    },
    // Shoulder caps — blend arm roots into torso silhouette
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
    // Neck — overlaps torso top and head base
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
      color: skinColor,
      roughness: 0.55,
      args: [headRadius, 20, 20],
      castShadow: true,
    },
    {
      key: 'hair',
      kind: 'sphereCap',
      position: [0, headY + (isElder ? 0.02 : 0.06), -0.02],
      color: isElder ? '#4a3728' : '#1e1b18',
      roughness: 0.9,
      args: [headRadius * 1.03, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55],
    },
    ...accessoryMeshes(config, headY, height),
  ];

  const faceWidth = headRadius * 1.35;
  const faceHeight = headRadius * 1.45;
  const headFrontZ = 0.04 + headRadius;

  return {
    type: 'humanoid',
    spec: {
      meshes,
      headY,
      headRadius,
      isElder,
      facePlane: {
        // Slightly in front of the head sphere — not inside it
        position: [0, headY, headFrontZ + headRadius * 0.04],
        size: [faceWidth, faceHeight],
      },
    },
  };
}
