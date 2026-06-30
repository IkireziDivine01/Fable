'use client';

import { useMemo } from 'react';
import { Float, Stars } from '@react-three/drei';
import { useEnvironmentPreset } from '@/lib/immersive/store';

function PropMesh({ type, position }: { type: string; position: [number, number, number] }) {
  if (type === 'tree') {
    return (
      <group position={position}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow>
          <coneGeometry args={[0.55, 1.2, 6]} />
          <meshStandardMaterial color="#2D5016" flatShading />
        </mesh>
      </group>
    );
  }

  if (type === 'hut') {
    return (
      <group position={position}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.55, 0.7, 8]} />
          <meshStandardMaterial color="#8B6914" flatShading />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.75, 0.5, 8]} />
          <meshStandardMaterial color="#520e33" flatShading />
        </mesh>
      </group>
    );
  }

  if (type === 'fire') {
    return (
      <Float speed={2} floatIntensity={0.4}>
        <mesh position={position}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#FF7956" emissive="#FF7956" emissiveIntensity={0.8} />
        </mesh>
      </Float>
    );
  }

  if (type === 'stall') {
    return (
      <group position={position}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.9, 0.08, 0.6]} />
          <meshStandardMaterial color="#DD6B20" />
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
      <mesh position={position}>
        <boxGeometry args={[1.4, 0.9, 0.06]} />
        <meshStandardMaterial color="#2C5282" />
      </mesh>
    );
  }

  return null;
}

export default function EnvironmentScene() {
  const preset = useEnvironmentPreset();

  const objects = useMemo(
    () =>
      preset.objects.map((obj) => ({
        type: obj.type,
        position: [obj.x, 0, obj.z ?? -1.5] as [number, number, number],
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
        <PropMesh key={`${obj.type}-${i}`} type={obj.type} position={obj.position} />
      ))}
    </>
  );
}
