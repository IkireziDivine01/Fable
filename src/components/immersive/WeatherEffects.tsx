'use client';

import { useMemo, useRef } from 'react';
import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { WeatherType } from '@/lib/immersive/types';

function RainLayer() {
  const groupRef = useRef<Group>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        x: ((i * 47) % 100) / 100 * 10 - 5,
        z: ((i * 31) % 100) / 100 * 6 - 3.5,
        speed: 2.2 + (i % 5) * 0.35,
        phase: (i * 0.37) % 1,
      })),
    []
  );

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const drop = drops[i];
      if (!drop || !(child as Mesh).isMesh) return;
      const y = 3.2 - ((t * drop.speed + drop.phase * 3.2) % 3.4);
      child.position.set(drop.x, y, drop.z);
    });
  });

  return (
    <group ref={groupRef}>
      {drops.map((drop, i) => (
        <mesh key={i} position={[drop.x, 2, drop.z]}>
          <boxGeometry args={[0.015, 0.14, 0.015]} />
          <meshBasicMaterial color="#B8D4E3" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function MistLayer({ fogColor }: { fogColor: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.4;
    const mat = ref.current.material as { opacity?: number };
    if (mat.opacity != null) {
      mat.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
    }
  });

  return (
    <mesh ref={ref} position={[0, 0.55, 0.2]}>
      <planeGeometry args={[14, 2.2]} />
      <meshBasicMaterial color={fogColor} transparent opacity={0.2} depthWrite={false} />
    </mesh>
  );
}

export default function WeatherEffects({
  weather,
  fogColor,
}: {
  weather: WeatherType;
  fogColor: string;
}) {
  if (weather === 'clear') return null;

  if (weather === 'rain') return <RainLayer />;

  if (weather === 'mist') return <MistLayer fogColor={fogColor} />;

  if (weather === 'fireflies') {
    return (
      <Sparkles
        count={28}
        scale={[8, 3, 5]}
        size={3}
        speed={0.35}
        opacity={0.85}
        color="#FFE4A8"
        position={[0, 1.2, -0.5]}
      />
    );
  }

  return null;
}
