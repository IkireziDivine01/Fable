'use client';

import { useMemo, useRef } from 'react';
import { Float, Stars } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three';
import WeatherEffects from './WeatherEffects';
import {
  useActiveWeather,
  useActiveTimeOfDay,
  useEnvironmentPreset,
  useImmersiveStore,
} from '@/lib/immersive/store';
import { TIME_OF_DAY_PALETTE } from '@/lib/immersive/timeOfDay';

function PropMesh({
  type,
  position,
  animate,
  accentColor,
  scale = 1,
  interactive,
  highlighted,
  onSelect,
}: {
  type: string;
  position: [number, number, number];
  animate: boolean;
  accentColor: string;
  scale?: number;
  interactive?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const scaledPosition: [number, number, number] = [
    position[0],
    position[1],
    position[2],
  ];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = interactive ? 1 + Math.sin(t * 2.4) * (highlighted ? 0.06 : 0.03) : 1;
    groupRef.current.scale.setScalar(scale * pulse);
    if (animate) {
      if (type === 'tree' || type === 'banana_tree') {
        groupRef.current.rotation.z = Math.sin(t * 0.8 + position[0]) * 0.04;
      }
      if (type === 'stall' || type === 'flower' || type === 'millet_field') {
        groupRef.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.015;
      }
      if (type === 'goat') {
        groupRef.current.position.y = position[1] + Math.sin(t * 2.4 + position[0]) * 0.012;
        groupRef.current.rotation.y = Math.sin(t * 0.6 + position[0]) * 0.08;
      }
      if (type === 'drum') {
        groupRef.current.scale.setScalar(
          scale * pulse * (1 + Math.sin(t * 3.2 + position[0]) * 0.02)
        );
      }
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || !onSelect) return;
    event.stopPropagation();
    onSelect();
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    if (!interactive) return;
    document.body.style.cursor = 'auto';
  };

  const interactionProps = interactive
    ? {
        onClick: handleClick,
        onPointerOver: handlePointerOver,
        onPointerOut: handlePointerOut,
      }
    : {};

  const content = (() => {
    if (type === 'tree') {
      return (
        <>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
            <meshStandardMaterial color="#4a3728" />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <coneGeometry args={[0.55, 1.2, 6]} />
            <meshStandardMaterial
              color={accentColor}
              flatShading
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.25 : 0}
            />
          </mesh>
        </>
      );
    }

    if (type === 'hut') {
      return (
        <>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.5, 0.55, 0.7, 8]} />
            <meshStandardMaterial color="#8B6914" flatShading />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <coneGeometry args={[0.75, 0.5, 8]} />
            <meshStandardMaterial
              color={accentColor}
              flatShading
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.2 : 0}
            />
          </mesh>
        </>
      );
    }

    if (type === 'fire') {
      return (
        <Float speed={2} floatIntensity={0.4}>
          <mesh>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={highlighted ? 1.2 : 0.8}
            />
          </mesh>
        </Float>
      );
    }

    if (type === 'stall') {
      return (
        <>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.9, 0.08, 0.6]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.2 : 0}
            />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.7, 0.5, 0.5]} />
            <meshStandardMaterial color="#C05621" flatShading />
          </mesh>
        </>
      );
    }

    if (type === 'board') {
      return (
        <mesh>
          <boxGeometry args={[1.4, 0.9, 0.06]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={highlighted ? accentColor : '#000000'}
            emissiveIntensity={highlighted ? 0.2 : 0}
          />
        </mesh>
      );
    }

    if (type === 'rock') {
      return (
        <mesh castShadow>
          <dodecahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial
            color={accentColor}
            flatShading
            roughness={0.85}
            emissive={highlighted ? accentColor : '#000000'}
            emissiveIntensity={highlighted ? 0.15 : 0}
          />
        </mesh>
      );
    }

    if (type === 'flower') {
      return (
        <>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.24, 6]} />
            <meshStandardMaterial color="#40916C" />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={highlighted ? 0.4 : 0.15}
            />
          </mesh>
        </>
      );
    }

    if (type === 'bench') {
      return (
        <>
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
        </>
      );
    }

    if (type === 'banana_tree') {
      return (
        <>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.1, 1.1, 6]} />
            <meshStandardMaterial color="#5C4033" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.15, 1.15, Math.sin(angle) * 0.15]}
                rotation={[0.55, angle, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.55, 0.04]} />
                <meshStandardMaterial
                  color={accentColor}
                  flatShading
                  emissive={highlighted ? accentColor : '#000000'}
                  emissiveIntensity={highlighted ? 0.2 : 0}
                />
              </mesh>
            );
          })}
          <mesh position={[0.2, 0.7, 0.15]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#D4A017" flatShading />
          </mesh>
        </>
      );
    }

    if (type === 'path') {
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[1.6, 3.2]} />
          <meshStandardMaterial
            color={accentColor}
            flatShading
            transparent
            opacity={0.55}
            emissive={highlighted ? accentColor : '#000000'}
            emissiveIntensity={highlighted ? 0.15 : 0}
          />
        </mesh>
      );
    }

    if (type === 'water_jug') {
      return (
        <>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial
              color={accentColor}
              flatShading
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.25 : 0}
            />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
            <meshStandardMaterial color="#8B6914" flatShading />
          </mesh>
          <mesh position={[0.12, 0.28, 0]} rotation={[0, 0, 0.4]}>
            <torusGeometry args={[0.08, 0.02, 6, 12]} />
            <meshStandardMaterial color="#6b3a2a" />
          </mesh>
        </>
      );
    }

    if (type === 'drum') {
      return (
        <>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.2, 0.45, 12]} />
            <meshStandardMaterial
              color="#5C4033"
              flatShading
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.2 : 0}
            />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.23, 0.23, 0.04, 12]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.04, 12]} />
            <meshStandardMaterial color="#3d2914" />
          </mesh>
        </>
      );
    }

    if (type === 'goat') {
      return (
        <>
          <mesh position={[0, 0.28, 0]} castShadow>
            <capsuleGeometry args={[0.14, 0.28, 4, 8]} />
            <meshStandardMaterial color="#C4A574" flatShading />
          </mesh>
          <mesh position={[0.18, 0.4, 0.06]} castShadow>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial
              color="#A89070"
              flatShading
              emissive={highlighted ? accentColor : '#000000'}
              emissiveIntensity={highlighted ? 0.2 : 0}
            />
          </mesh>
          <mesh position={[0.22, 0.52, 0.02]}>
            <coneGeometry args={[0.03, 0.1, 5]} />
            <meshStandardMaterial color="#5C4033" />
          </mesh>
          <mesh position={[0.16, 0.52, 0.02]}>
            <coneGeometry args={[0.03, 0.1, 5]} />
            <meshStandardMaterial color="#5C4033" />
          </mesh>
          <mesh position={[-0.08, 0.12, 0.08]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <meshStandardMaterial color="#6b3a2a" />
          </mesh>
          <mesh position={[-0.08, 0.12, -0.08]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <meshStandardMaterial color="#6b3a2a" />
          </mesh>
          <mesh position={[0.1, 0.12, 0.08]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <meshStandardMaterial color="#6b3a2a" />
          </mesh>
          <mesh position={[0.1, 0.12, -0.08]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <meshStandardMaterial color="#6b3a2a" />
          </mesh>
        </>
      );
    }

    if (type === 'millet_field') {
      return (
        <>
          {[-0.35, -0.12, 0.12, 0.35].map((x, i) => (
            <group key={i} position={[x, 0, (i % 2) * 0.12 - 0.06]}>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.02, 0.03, 0.55, 5]} />
                <meshStandardMaterial color="#6B8E23" />
              </mesh>
              <mesh position={[0, 0.58, 0]}>
                <sphereGeometry args={[0.07, 6, 6]} />
                <meshStandardMaterial
                  color={accentColor}
                  flatShading
                  emissive={highlighted ? accentColor : '#000000'}
                  emissiveIntensity={highlighted ? 0.2 : 0}
                />
              </mesh>
            </group>
          ))}
        </>
      );
    }

    return null;
  })();

  if (!content) return null;

  return (
    <group ref={groupRef} position={scaledPosition} {...interactionProps}>
      {content}
    </group>
  );
}

export default function EnvironmentScene() {
  const preset = useEnvironmentPreset();
  const weather = useActiveWeather();
  const timeOfDay = useActiveTimeOfDay();
  const todPalette = TIME_OF_DAY_PALETTE[timeOfDay];
  const worldPreviewActive = useImmersiveStore((s) => s.worldPreviewActive);
  const isPlaying = useImmersiveStore((s) => s.isPlaying);
  const hotspots = useImmersiveStore((s) => s.hotspots);
  const activeHotspotId = useImmersiveStore((s) => s.activeHotspotId);
  const setActiveHotspot = useImmersiveStore((s) => s.setActiveHotspot);
  const hasDialogue = useImmersiveStore((s) =>
    Boolean(s.currentSentenceText.trim() || s.currentKinyarwandaText.trim())
  );
  const animateProps = worldPreviewActive || isPlaying || hasDialogue;

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    return preset.objects.map((obj) => {
      const index = counts.get(obj.type) ?? 0;
      counts.set(obj.type, index + 1);
      return {
        type: obj.type,
        position: [obj.x, 0, obj.z ?? -1.5] as [number, number, number],
        scale: obj.scale ?? 1,
        typeIndex: index,
      };
    });
  }, [preset.objects]);

  const hotspotForProp = (type: string, typeIndex: number) =>
    hotspots.find((h) => {
      if (h.propType !== type) return false;
      if (h.propIndex === undefined) return typeIndex === 0;
      return h.propIndex === typeIndex;
    });

  const fogNear =
    timeOfDay === 'dawn' || weather === 'mist'
      ? 2.5
      : weather === 'rain'
        ? 3.2
        : timeOfDay === 'dusk'
          ? 3.5
          : 4;
  const fogFar = weather === 'mist' || timeOfDay === 'dawn' ? 10 : 14;
  const weatherDim =
    weather === 'rain' || weather === 'mist'
      ? 0.85
      : weather === 'fireflies'
        ? 0.75
        : 1;
  const lightIntensity = preset.lighting.intensity * weatherDim;
  const ambientIntensity = Math.max(0.18, 0.35 + todPalette.ambientBoost);
  const showStars =
    todPalette.starDensity > 0 ||
    preset.environmentType === 'forest' ||
    weather === 'fireflies';
  const sunHeight = timeOfDay === 'dawn' ? 3.5 : timeOfDay === 'dusk' ? 2.8 : timeOfDay === 'night' ? 5 : 6;
  const sunX = timeOfDay === 'dawn' ? -4 : timeOfDay === 'dusk' ? 4 : 3;

  return (
    <>
      <color attach="background" args={[preset.backgroundColor]} />
      <fog
        attach="fog"
        args={[preset.fogColor ?? preset.backgroundColor, fogNear, fogFar]}
      />

      <ambientLight intensity={ambientIntensity} color={preset.lighting.color} />
      <directionalLight
        position={[sunX, sunHeight, 4]}
        intensity={lightIntensity}
        color={preset.lighting.color}
        castShadow
      />
      <hemisphereLight
        args={[preset.lighting.color, preset.groundColor ?? '#3d2914', 0.4]}
      />

      {showStars && (
        <Stars
          radius={50}
          depth={30}
          count={todPalette.starDensity || 800}
          factor={timeOfDay === 'night' ? 2.4 : 2}
          saturation={0.2}
          fade
          speed={0.5}
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color={preset.groundColor ?? '#C4A574'} flatShading />
      </mesh>

      <mesh position={[0, 0.3, -6]} rotation={[0, 0, 0]}>
        <coneGeometry args={[8, 2.5, 4]} />
        <meshStandardMaterial color={preset.fogColor ?? preset.backgroundColor} flatShading />
      </mesh>

      {typeCounts.map((obj, i) => {
        const hotspot = hotspotForProp(obj.type, obj.typeIndex);
        return (
          <PropMesh
            key={`${obj.type}-${obj.typeIndex}-${i}`}
            type={obj.type}
            position={obj.position}
            scale={obj.scale}
            accentColor={preset.accentColor ?? '#520e33'}
            animate={animateProps}
            interactive={Boolean(hotspot)}
            highlighted={hotspot?.id === activeHotspotId}
            onSelect={hotspot ? () => setActiveHotspot(hotspot.id) : undefined}
          />
        );
      })}

      <WeatherEffects
        weather={weather}
        fogColor={preset.fogColor ?? preset.backgroundColor}
      />
    </>
  );
}
