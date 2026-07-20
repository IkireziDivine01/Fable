'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { ContactShadows, Stars } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { BackSide, Color, ShaderMaterial } from 'three';
import WeatherEffects from './WeatherEffects';
import PropModel, { preloadPropModels } from './PropModel';
import { ProceduralPropContent } from './ProceduralProps';
import {
  useActiveWeather,
  useActiveTimeOfDay,
  useEnvironmentPreset,
  useImmersiveStore,
} from '@/lib/immersive/store';
import { TIME_OF_DAY_PALETTE } from '@/lib/immersive/timeOfDay';
import { getPropModelConfig, propModelUrlsForTypes } from '@/lib/immersive/propModels';
import type { PropType } from '@/lib/immersive/types';

function PropMesh({
  type,
  position,
  animate,
  accentColor,
  scale = 1,
  interactive,
  highlighted,
  windowGlow,
  onSelect,
}: {
  type: string;
  position: [number, number, number];
  animate: boolean;
  accentColor: string;
  scale?: number;
  interactive?: boolean;
  highlighted?: boolean;
  windowGlow: number;
  onSelect?: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const propType = type as PropType;
  const hasModel = Boolean(getPropModelConfig(propType));

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = interactive
      ? 1 + Math.sin(t * (highlighted ? 3.6 : 2.4)) * (highlighted ? 0.1 : 0.03)
      : 1;
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

  // Always bind interaction on the outer group so GLTF + procedural fallbacks stay tappable
  const interactionProps = interactive
    ? {
        onClick: handleClick,
        onPointerOver: handlePointerOver,
        onPointerOut: handlePointerOut,
      }
    : {};

  const procedural = (
    <ProceduralPropContent
      type={type}
      accentColor={accentColor}
      highlighted={highlighted}
      windowGlow={windowGlow}
    />
  );

  return (
    <group ref={groupRef} position={position} {...interactionProps}>
      {hasModel ? (
        <Suspense fallback={procedural}>
          <PropModel
            type={propType}
            accentColor={accentColor}
            highlighted={highlighted}
            windowGlow={windowGlow}
            fallback={procedural}
          />
        </Suspense>
      ) : (
        procedural
      )}
    </group>
  );
}

function GradientSky({
  topColor,
  bottomColor,
}: {
  topColor: string;
  bottomColor: string;
}) {
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        topColor: { value: new Color(topColor) },
        bottomColor: { value: new Color(bottomColor) },
      },
      vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            float t = clamp(h * 0.65 + 0.45, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
          }
        `,
      depthWrite: false,
      side: BackSide,
    });
    // Colors update via uniforms effect below; recreate only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sky shader shell is stable
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.topColor.value.set(topColor);
    material.uniforms.bottomColor.value.set(bottomColor);
  }, [material, topColor, bottomColor]);

  return (
    <mesh scale={[40, 40, 40]}>
      <sphereGeometry args={[1, 24, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function DistantHills({
  fogColor,
  groundColor,
}: {
  fogColor: string;
  groundColor: string;
}) {
  const layers = useMemo(
    () => [
      { x: -6, z: -8.5, s: 5.5, h: 2.2, color: fogColor },
      { x: 5, z: -9.5, s: 6.2, h: 2.8, color: groundColor },
      { x: 0, z: -11, s: 8, h: 3.4, color: fogColor },
      { x: -10, z: -10, s: 4.5, h: 1.8, color: groundColor },
      { x: 9, z: -10.5, s: 5, h: 2.0, color: fogColor },
    ],
    [fogColor, groundColor]
  );

  return (
    <group>
      {layers.map((hill, i) => (
        <mesh
          key={i}
          position={[hill.x, hill.h * 0.35 - 0.2, hill.z]}
          scale={[hill.s, hill.h, hill.s * 0.55]}
          receiveShadow
        >
          <sphereGeometry args={[1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            color={hill.color}
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

function GroundPlane({
  groundColor,
  pathColor,
}: {
  groundColor: string;
  pathColor: string;
}) {
  const meshRef = useRef<Mesh>(null);

  // Subtle vertex color variation via material color lerp on two rings
  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.2]} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={0.92}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0.08, 0]} position={[0, 0.012, 0.35]} receiveShadow>
        <planeGeometry args={[2.2, 7]} />
        <meshStandardMaterial
          color={pathColor}
          roughness={0.98}
          transparent
          opacity={0.55}
        />
      </mesh>
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
  const engagementMode = useImmersiveStore((s) => s.engagementMode);
  const engagementTargetPropTypes = useImmersiveStore((s) => s.engagementTargetPropTypes);
  const foundPropTypes = useImmersiveStore((s) => s.foundPropTypes);
  const wrongTapPropType = useImmersiveStore((s) => s.wrongTapPropType);
  const hintPropType = useImmersiveStore((s) => s.hintPropType);
  const vocabExpectedPropType = useImmersiveStore((s) => s.vocabExpectedPropType);
  const onEngagementPropSelect = useImmersiveStore((s) => s.onEngagementPropSelect);
  const hasDialogue = useImmersiveStore((s) =>
    Boolean(s.currentSentenceText.trim() || s.currentKinyarwandaText.trim())
  );
  const animateProps =
    worldPreviewActive ||
    isPlaying ||
    hasDialogue ||
    engagementMode === 'hunt' ||
    engagementMode === 'vocab';
  const inEngagement = engagementMode === 'hunt' || engagementMode === 'vocab';

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

  useEffect(() => {
    const urls = propModelUrlsForTypes(typeCounts.map((o) => o.type));
    preloadPropModels(urls);
  }, [typeCounts]);

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
  const ambientIntensity = Math.max(0.22, 0.38 + todPalette.ambientBoost);
  const showStars =
    todPalette.starDensity > 0 ||
    preset.environmentType === 'forest' ||
    weather === 'fireflies';
  const sunHeight =
    timeOfDay === 'dawn' ? 3.5 : timeOfDay === 'dusk' ? 2.8 : timeOfDay === 'night' ? 5 : 6;
  const sunX = timeOfDay === 'dawn' ? -4 : timeOfDay === 'dusk' ? 4 : 3;

  const windowGlow =
    timeOfDay === 'night' ? 0.85 : timeOfDay === 'dusk' ? 0.55 : timeOfDay === 'dawn' ? 0.2 : 0.08;

  const skyTop =
    timeOfDay === 'night'
      ? '#0a1220'
      : timeOfDay === 'dusk'
        ? '#5a2040'
        : timeOfDay === 'dawn'
          ? '#F5B8A8'
          : '#7EB6D9';
  const skyBottom = preset.fogColor ?? preset.backgroundColor;
  const groundColor = preset.groundColor ?? '#C4A574';
  const pathColor = preset.accentColor ?? '#8B6914';

  return (
    <>
      <color attach="background" args={[preset.backgroundColor]} />
      <fog
        attach="fog"
        args={[preset.fogColor ?? preset.backgroundColor, fogNear, fogFar]}
      />

      <GradientSky topColor={skyTop} bottomColor={skyBottom} />

      <ambientLight intensity={ambientIntensity} color={preset.lighting.color} />
      <directionalLight
        position={[sunX, sunHeight, 4]}
        intensity={lightIntensity}
        color={preset.lighting.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0003}
      />
      <hemisphereLight
        args={[preset.lighting.color, groundColor, 0.45]}
      />
      {/* Soft fill toward characters */}
      <directionalLight
        position={[-2.5, 2.2, 5]}
        intensity={0.22 * weatherDim}
        color="#FFE8D6"
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

      <GroundPlane groundColor={groundColor} pathColor={pathColor} />
      <DistantHills
        fogColor={preset.fogColor ?? preset.backgroundColor}
        groundColor={groundColor}
      />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={timeOfDay === 'night' ? 0.35 : 0.45}
        scale={16}
        blur={2.4}
        far={6}
        color="#1a120c"
      />

      {typeCounts.map((obj, i) => {
        const hotspot = hotspotForProp(obj.type, obj.typeIndex);
        const isEngagementTarget =
          inEngagement && engagementTargetPropTypes.includes(obj.type);
        const alreadyFound = foundPropTypes.includes(obj.type);
        const interactive = inEngagement
          ? isEngagementTarget && !alreadyFound
          : Boolean(hotspot);
        // Hunt: only the current glowing target. Vocab: expected answer pulses; hint louder.
        const isCurrentGoal =
          engagementMode === 'hunt'
            ? isEngagementTarget && !alreadyFound
            : engagementMode === 'vocab'
              ? obj.type === vocabExpectedPropType && !alreadyFound
              : false;
        const highlighted = inEngagement
          ? wrongTapPropType === obj.type ||
            hintPropType === obj.type ||
            isCurrentGoal
          : hotspot?.id === activeHotspotId;

        return (
          <PropMesh
            key={`${obj.type}-${obj.typeIndex}-${i}`}
            type={obj.type}
            position={obj.position}
            scale={obj.scale}
            accentColor={
              highlighted && engagementMode === 'hunt'
                ? '#E8B84A'
                : highlighted && engagementMode === 'vocab'
                  ? '#E8836B'
                  : (preset.accentColor ?? '#520e33')
            }
            animate={animateProps}
            interactive={interactive}
            highlighted={highlighted}
            windowGlow={windowGlow}
            onSelect={
              interactive
                ? () => {
                    if (inEngagement) {
                      onEngagementPropSelect?.(obj.type);
                      return;
                    }
                    if (hotspot) setActiveHotspot(hotspot.id);
                  }
                : undefined
            }
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
