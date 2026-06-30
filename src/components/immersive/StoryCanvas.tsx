'use client';

import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import EnvironmentScene from './EnvironmentScene';
import StoryCharacterMesh from './StoryCharacterMesh';
import { useImmersiveStore } from '@/lib/immersive/store';
import { CHARACTER_META } from '@/lib/immersive/presets';

function CameraRig({ compact }: { compact: boolean }) {
  const cameraZoom = useImmersiveStore((s) => s.cameraZoom);
  const { camera } = useThree();
  const baseY = compact ? 1.55 : 1.55;
  const baseX = 0;

  useFrame(() => {
    camera.position.x += (baseX - camera.position.x) * 0.08;
    camera.position.y += (baseY - camera.position.y) * 0.08;
    camera.position.z += (cameraZoom - camera.position.z) * 0.08;
    camera.lookAt(0, 1.1, 0);
  });

  return null;
}

function SceneContents() {
  const characters = useImmersiveStore((s) => s.characters);
  const mouthOpenness = useImmersiveStore((s) => s.mouthOpenness);
  const activeCharacterIndex = useImmersiveStore((s) => s.activeCharacterIndex);
  const isPlaying = useImmersiveStore((s) => s.isPlaying);
  const currentSentenceText = useImmersiveStore((s) => s.currentSentenceText);
  const currentKinyarwandaText = useImmersiveStore((s) => s.currentKinyarwandaText);
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Storyteller', type: 'grandma' as const, position: 1 }];

  const spread = Math.min(2.4, Math.max(1.4, slots.length * 1.0));

  return (
    <>
      <EnvironmentScene />
      {slots.map((char, i) => {
        const x = (i - (slots.length - 1) / 2) * spread;
        const isActive = i === activeCharacterIndex;
        const meta = CHARACTER_META[char.type];
        return (
          <StoryCharacterMesh
            key={`${char.type}-${char.name}-${i}`}
            position={[x, 0, isActive ? 0.35 : -0.15]}
            skinColor={meta.skinColor}
            garmentColor={meta.garmentColor}
            accentColor={meta.accentColor}
            height={meta.height}
            mouthOpenness={isActive && isPlaying ? mouthOpenness : 0}
            isSpeaking={isActive && (isPlaying || Boolean(currentSentenceText))}
            characterType={char.type}
            characterName={char.name}
            speechText={isActive ? currentSentenceText : undefined}
            kinyarwandaText={isActive ? currentKinyarwandaText : undefined}
            displayLanguage={displayLanguage}
          />
        );
      })}
      <Preload all />
    </>
  );
}

export default function StoryCanvas({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${compact ? 'absolute inset-0' : 'absolute inset-0'} bg-[#1e1b18]`}>
      <Canvas
        camera={{ position: [0, 1.55, compact ? 5 : 4.2], fov: compact ? 45 : 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <CameraRig compact={compact} />
          <SceneContents />
        </Suspense>
      </Canvas>
      {!compact && (
        <div
          className="pointer-events-none absolute inset-3 rounded-lg border border-[#C4A574]/30 md:inset-5"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(196, 165, 116, 0.08) 8px, rgba(196, 165, 116, 0.08) 9px)`,
          }}
        />
      )}
    </div>
  );
}
