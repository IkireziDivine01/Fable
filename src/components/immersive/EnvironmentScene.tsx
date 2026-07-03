'use client';

import { useMemo, useRef } from 'react';
import { Float, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useEnvironmentPreset, useImmersiveStore } from '@/lib/immersive/store';

function PropMesh({
  type,
  position,
  animate,
  accentColor,
  scale = 1,
}: {
  type: string;
  position: [number, number, number];
  animate: boolean;
  accentColor: string;
  scale?: number;
}) {
  const groupRef = useRef<Group>(null);
  const scaledPosition: [number, number, number] = [
    position[0],
    position[1],
    position[2],
  ];

  useFrame((state) => {
    if (!animate || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (type === 'tree') {
      groupRef.current.rotation.z = Math.sin(t * 0.8 + position[0]) * 0.04;
    }
    if (type === 'stall' || type === 'flower') {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.015;
    }
  });

  if (type === 'tree') {
    return (
      <group ref={groupRef} position={scaledPosition} scale={scale}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow>
          <coneGeometry args={[0.55, 1.2, 6]} />
          <meshStandardMaterial color={accentColor} flatShading />
        </mesh>
      </group>
    );
  }

  if (type === 'hut') {
    return (
      <group position={scaledPosition} scale={scale}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.55, 0.7, 8]} />
          <meshStandardMaterial color="#8B6914" flatShading />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.75, 0.5, 8]} />
          <meshStandardMaterial color={accentColor} flatShading />
        </mesh>
      </group>
    );
  }

  if (type === 'fire') {
    return (
      <Float speed={2} floatIntensity={0.4}>
        <group position={scaledPosition} scale={scale}>
          <mesh>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
          </mesh>
        </group>
      </Float>
    );
  }

  if (type === 'stall') {
    return (
      <group ref={groupRef} position={scaledPosition} scale={scale}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.9, 0.08, 0.6]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.7, 0.5, 0.5]} />
          <meshStandardMaterial color="#C05621" flatShading />
        </mesh>
      </group>
    );
  }

  if (type === 'board') {
    return (
      <group position={scaledPosition} scale={scale}>
        <mesh>
          <boxGeometry args={[1.4, 0.9, 0.06]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
      </group>
    );
  }

  if (type === 'rock') {
    return (
      <mesh position={scaledPosition} scale={scale} castShadow>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={accentColor} flatShading roughness={0.85} />
      </mesh>
    );
  }

  if (type === 'flower') {
    return (
      <group ref={groupRef} position={scaledPosition} scale={scale}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.24, 6]} />
          <meshStandardMaterial color="#40916C" />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.15} />
        </mesh>
      </group>
    );
  }

  if (type === 'bench') {
    return (
      <group position={scaledPosition} scale={scale}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.9, 0.06, 0.35]} />
          <meshStandardMaterial color="#6b3a2a" />
        </mesh>
        <mesh position={[-0.32, 0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.3]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
        <mesh position={[0.32, 0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.3]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
      </group>
    );
  }

  return null;
}

export default function EnvironmentScene() {
  const preset = useEnvironmentPreset();
  const worldPreviewActive = useImmersiveStore((s) => s.worldPreviewActive);

  const objects = useMemo(
    () =>
      preset.objects.map((obj) => ({
        type: obj.type,
        position: [obj.x, 0, obj.z ?? -1.5] as [number, number, number],
        scale: obj.scale ?? 1,
      })),
    [preset.objects]
  );

  return (
    <>
      <color attach="background" args={[preset.backgroundColor]} />
      <fog attach="fog" args={[preset.fogColor ?? preset.backgroundColor, 4, 14]} />

      <ambientLight intensity={0.35} color={preset.lighting.color} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={preset.lighting.intensity}
        color={preset.lighting.color}
        castShadow
      />
      <hemisphereLight
        args={[preset.lighting.color, preset.groundColor ?? '#3d2914', 0.4]}
      />

      {preset.environmentType === 'forest' && (
        <Stars radius={50} depth={30} count={800} factor={2} saturation={0.2} fade speed={0.5} />
      )}

      {/* Ground — warm earth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color={preset.groundColor ?? '#C4A574'} flatShading />
      </mesh>

      {/* Distant hills — minimal silhouette */}
      <mesh position={[0, 0.3, -6]} rotation={[0, 0, 0]}>
        <coneGeometry args={[8, 2.5, 4]} />
        <meshStandardMaterial color={preset.fogColor ?? preset.backgroundColor} flatShading />
      </mesh>

      {objects.map((obj, i) => (
        <PropMesh
          key={`${obj.type}-${i}`}
          type={obj.type}
          position={obj.position}
          scale={obj.scale}
          accentColor={preset.accentColor ?? '#520e33'}
          animate={worldPreviewActive}
        />
      ))}
    </>
  );
}
