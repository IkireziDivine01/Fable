'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import {
  TorusGeometry,
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
} from 'three';
import type { CharacterType, RhubarbViseme } from '@/lib/immersive/types';
import { resolveCharacterConfig } from '@/lib/immersive/character/config';
import { buildRig, type RigMeshSpec } from '@/lib/immersive/character/rig';
import {
  BLINK_DURATION_MS,
  createFaceTextureHandle,
  nextBlinkDelay,
} from '@/lib/immersive/character/faceTexture';
import { nextTtsViseme } from '@/lib/immersive/lipSync';
import SpeechIndicator from './SpeechIndicator';

interface StoryCharacterMeshProps {
  position: [number, number, number];
  skinColor: string;
  garmentColor: string;
  accentColor: string;
  height: number;
  mouthViseme: RhubarbViseme;
  isSpeaking: boolean;
  idleMotion?: boolean;
  previewSpeech?: boolean;
  showNameLabel?: boolean;
  characterType: CharacterType;
  characterName?: string;
  eyeColor?: string;
  hasBlush?: boolean;
  blushColor?: string;
  bodyPattern?: string | string[];
  accessories?: Array<'headwrap' | 'necklace'>;
}

function RigMesh({ spec }: { spec: RigMeshSpec }) {
  const geometry = useMemo(() => {
    switch (spec.kind) {
      case 'capsule':
        return new CapsuleGeometry(spec.args[0], spec.args[1], spec.args[2], spec.args[3]);
      case 'sphere':
        return new SphereGeometry(spec.args[0], spec.args[1], spec.args[2]);
      case 'sphereCap':
        return new SphereGeometry(
          spec.args[0],
          spec.args[1],
          spec.args[2],
          spec.args[3],
          spec.args[4],
          spec.args[5],
          spec.args[6]
        );
      case 'cylinder':
        return new CylinderGeometry(
          spec.args[0],
          spec.args[1],
          spec.args[2],
          spec.args[3]
        );
      case 'box':
        return new BoxGeometry(spec.args[0], spec.args[1], spec.args[2]);
      case 'torso':
        return new CylinderGeometry(
          spec.args[0],
          spec.args[1],
          spec.args[2],
          spec.args[3]
        );
      case 'torus':
        return new TorusGeometry(spec.args[0], spec.args[1], spec.args[2], spec.args[3]);
      default:
        return new SphereGeometry(0.1, 8, 8);
    }
  }, [spec]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
      castShadow={spec.castShadow}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={spec.color} roughness={spec.roughness ?? 0.7} />
    </mesh>
  );
}

export default function StoryCharacterMesh({
  position,
  skinColor,
  garmentColor,
  accentColor,
  height,
  mouthViseme,
  isSpeaking,
  idleMotion = false,
  previewSpeech = false,
  showNameLabel = false,
  characterType,
  characterName,
  eyeColor,
  hasBlush,
  blushColor,
  bodyPattern,
  accessories,
}: StoryCharacterMeshProps) {
  const groupRef = useRef<Group>(null);
  const mouthRef = useRef<Mesh>(null);
  const previewFrameRef = useRef(0);
  const [blinking, setBlinking] = useState(false);

  const config = useMemo(
    () =>
      resolveCharacterConfig({
        name: characterName ?? '',
        type: characterType,
        position: 0,
        appearance: {
          skinColor,
          garmentColor,
          accentColor,
          eyeColor,
          hasBlush,
          blushColor,
          bodyPattern,
          accessories,
        },
      }),
    [
      accentColor,
      accessories,
      blushColor,
      bodyPattern,
      characterName,
      characterType,
      eyeColor,
      garmentColor,
      hasBlush,
      skinColor,
    ]
  );

  const rig = useMemo(() => buildRig(characterType, config), [characterType, config]);

  const faceHandle = useMemo(() => createFaceTextureHandle(), []);
  useEffect(() => () => faceHandle.dispose(), [faceHandle]);

  const faceStateRef = useRef({ viseme: 'X' as RhubarbViseme, blinking: false });

  useLayoutEffect(() => {
    faceHandle.redraw(config, { viseme: 'X', blinking: false });
    faceStateRef.current = { viseme: 'X', blinking: false };
  }, [config, faceHandle]);

  useEffect(() => {
    if (faceStateRef.current.blinking === blinking) return;
    faceStateRef.current = { ...faceStateRef.current, blinking };
    faceHandle.redraw(config, { viseme: faceStateRef.current.viseme, blinking });
  }, [blinking, config, faceHandle]);

  useEffect(() => {
    if (rig.type === 'dog') return undefined;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    let unblinkTimeout: ReturnType<typeof setTimeout>;
    const seed = Math.abs(position[0] * 1000 + position[1] * 100);

    const scheduleBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlinking(true);
        unblinkTimeout = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, nextBlinkDelay(seed));
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(unblinkTimeout);
    };
  }, [position, rig.type]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const speakBob = isSpeaking ? Math.sin(t * 5) * 0.015 : 0;
    const idleBob = idleMotion ? Math.sin(t * 1.4 + position[0]) * 0.012 : 0;
    const idleSway = idleMotion ? Math.sin(t * 0.9 + position[0]) * 0.04 : 0;
    groupRef.current.position.y = position[1] + speakBob + idleBob;
    groupRef.current.rotation.y = idleSway;

    if (rig.type === 'humanoid') {
      const activeViseme: RhubarbViseme = isSpeaking
        ? previewSpeech
          ? nextTtsViseme(Math.floor(t * 9))
          : mouthViseme
        : 'X';

      if (
        activeViseme !== faceStateRef.current.viseme ||
        blinking !== faceStateRef.current.blinking
      ) {
        faceStateRef.current = { viseme: activeViseme, blinking };
        faceHandle.redraw(config, faceStateRef.current);
      }
    }

    if (rig.type === 'dog' && mouthRef.current && previewSpeech && isSpeaking) {
      previewFrameRef.current += 1;
      const openness = 0.35 + Math.sin(t * 8) * 0.15;
      const mouthScale = 0.03 + openness * 0.2;
      mouthRef.current.scale.y = mouthScale * 3.5;
    }
  });

  const facePlaneGeometry = useMemo(() => {
    if (rig.type !== 'humanoid') return null;
    return new PlaneGeometry(rig.spec.facePlane.size[0], rig.spec.facePlane.size[1]);
  }, [rig]);

  useEffect(() => {
    return () => facePlaneGeometry?.dispose();
  }, [facePlaneGeometry]);

  if (rig.type === 'dog') {
    const { spec } = rig;
    return (
      <group ref={groupRef} position={position}>
        {spec.meshes.map((mesh) => (
          <RigMesh key={mesh.key} spec={mesh} />
        ))}
        <mesh
          ref={mouthRef}
          position={spec.mouthPosition}
          scale={spec.mouthScale}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#3d2914" />
        </mesh>
        <CharacterOverlays
          headY={spec.headY}
          height={height}
          isDog
          isSpeaking={isSpeaking}
          characterName={characterName}
          showNameLabel={showNameLabel}
        />
      </group>
    );
  }

  const { spec } = rig;

  return (
    <group ref={groupRef} position={position}>
      {spec.meshes.map((mesh) => (
        <RigMesh key={mesh.key} spec={mesh} />
      ))}

      {/* Canvas face — plane overlay on head front (avoids sphere UV distortion) */}
      {facePlaneGeometry && (
        <mesh position={spec.facePlane.position} renderOrder={10}>
          <primitive object={facePlaneGeometry} attach="geometry" />
          <meshBasicMaterial
            map={faceHandle.texture}
            transparent
            toneMapped={false}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      <CharacterOverlays
        headY={spec.headY}
        height={height}
        isSpeaking={isSpeaking}
        characterName={characterName}
        showNameLabel={showNameLabel}
      />
    </group>
  );
}

/** drei Html scale ≈ objectScale(camera distance) × factor — ~4 keeps px-sized overlays at z≈5. */
const OVERLAY_DISTANCE_FACTOR = 4;

function CharacterOverlays({
  headY,
  height,
  isDog = false,
  isSpeaking,
  characterName,
  showNameLabel,
}: {
  headY: number;
  height: number;
  isDog?: boolean;
  isSpeaking: boolean;
  characterName?: string;
  showNameLabel: boolean;
}) {
  return (
    <>
      {isSpeaking && (
        <Html
          position={[0, headY + 0.38, 0.15]}
          center
          distanceFactor={OVERLAY_DISTANCE_FACTOR}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <SpeechIndicator />
        </Html>
      )}

      {showNameLabel && characterName && (
        <Html
          position={[0, isDog ? height * 0.15 : 0.08, 0.2]}
          center
          distanceFactor={OVERLAY_DISTANCE_FACTOR}
          zIndexRange={[90, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(82, 14, 51, 0.82)',
              border: '1px solid rgba(255, 219, 210, 0.35)',
              fontFamily: "'Baloo 2', 'Fredoka', cursive, sans-serif",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#ffdbd2',
              whiteSpace: 'nowrap',
            }}
          >
            {characterName}
          </div>
        </Html>
      )}
    </>
  );
}
