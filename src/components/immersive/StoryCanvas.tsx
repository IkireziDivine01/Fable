'use client';

import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import EnvironmentScene from './EnvironmentScene';
import HotspotCard from './HotspotCard';
import StoryCharacterMesh from './StoryCharacterMesh';
import StoryDialogueHud from './StoryDialogueHud';
import { useImmersiveStore, useActiveGesture } from '@/lib/immersive/store';
import { CHARACTER_META } from '@/lib/immersive/presets';
import { getCharacterX } from '@/lib/immersive/speaker';
import { getCharacterSpread } from '@/lib/immersive/speaker';
import { resolveCharacterAppearance } from '@/lib/immersive/sceneSpec';

function CameraRig({ compact, worldPreview }: { compact: boolean; worldPreview: boolean }) {
  const cameraZoom = useImmersiveStore((s) => s.cameraZoom);
  const activeCharacterIndex = useImmersiveStore((s) => s.activeCharacterIndex);
  const characters = useImmersiveStore((s) => s.characters);
  const isPlaying = useImmersiveStore((s) => s.isPlaying);
  const hasDialogue = useImmersiveStore((s) =>
    Boolean(s.currentSentenceText.trim() || s.currentKinyarwandaText.trim())
  );
  const { camera } = useThree();
  const baseY = compact ? 1.55 : 1.85;
  const lookAtY = compact ? 1.1 : 1.35;

  const slotCount = characters.length > 0 ? characters.length : 1;
  // Match StoryCharacterMesh X so the framing lands on the speaker
  const focusX = getCharacterX(activeCharacterIndex, slotCount || 1);
  const focusZ = !worldPreview && hasDialogue ? 0.35 : 0;
  const closeUp = !worldPreview && hasDialogue;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const orbitX = worldPreview ? Math.sin(t * 0.22) * 0.55 : 0;
    const orbitZ = worldPreview ? Math.cos(t * 0.18) * 0.25 : 0;
    // Center on the active speaker; slight lag keeps a soft cinematic pan
    const targetX = worldPreview ? orbitX : focusX;
    const targetY = baseY + (worldPreview ? Math.sin(t * 0.35) * 0.04 : 0);
    const closeUpZoom = closeUp ? (isPlaying ? -0.75 : -0.45) : 0;
    const targetZ = cameraZoom + orbitZ + closeUpZoom;
    const lookAtX = worldPreview ? 0 : focusX;
    const lookAtZ = worldPreview ? 0 : focusZ;
    // Snappier follow when the speaker changes so narration feels locked on
    const ease = worldPreview ? 0.06 : closeUp ? 0.1 : 0.08;

    camera.position.x += (targetX - camera.position.x) * ease;
    camera.position.y += (targetY - camera.position.y) * ease;
    camera.position.z += (targetZ - camera.position.z) * ease;
    camera.lookAt(lookAtX, lookAtY, lookAtZ);
  });

  return null;
}

function SceneContents({
  showCharacterLabels,
  enablePostFx,
}: {
  showCharacterLabels: boolean;
  enablePostFx: boolean;
}) {
  const characters = useImmersiveStore((s) => s.characters);
  const mouthViseme = useImmersiveStore((s) => s.mouthViseme);
  const activeCharacterIndex = useImmersiveStore((s) => s.activeCharacterIndex);
  const isPlaying = useImmersiveStore((s) => s.isPlaying);
  const worldPreviewActive = useImmersiveStore((s) => s.worldPreviewActive);
  const currentSentenceText = useImmersiveStore((s) => s.currentSentenceText);
  const sentenceIndex = useImmersiveStore((s) => s.sentenceIndex);
  const eventGesture = useActiveGesture();

  const slots =
    characters.length > 0
      ? characters
      : [{ name: 'Storyteller', type: 'grandma' as const, position: 1 }];

  const spread = getCharacterSpread(slots.length);
  // Prefer AI/heuristic event gesture; first line gets a welcoming wave
  const reactionGesture =
    eventGesture ?? (sentenceIndex === 0 && (isPlaying || Boolean(currentSentenceText)) ? 'wave' : null);

  return (
    <>
      <EnvironmentScene />
      {slots.map((char, i) => {
        const x = (i - (slots.length - 1) / 2) * spread;
        const isActive = i === activeCharacterIndex;
        const meta = CHARACTER_META[char.type];
        const appearance = resolveCharacterAppearance(char);
        return (
          <StoryCharacterMesh
            key={`${char.type}-${char.name}-${i}`}
            position={[x, 0, isActive ? 0.35 : -0.15]}
            skinColor={appearance.skinColor}
            garmentColor={appearance.garmentColor}
            accentColor={appearance.accentColor}
            height={appearance.height}
            heightScale={appearance.heightScale}
            mouthViseme={isActive && isPlaying ? mouthViseme : 'X'}
            eyeColor={appearance.eyeColor}
            hasBlush={appearance.hasBlush}
            blushColor={appearance.blushColor}
            bodyPattern={appearance.bodyPattern}
            accessories={appearance.accessories}
            hairStyle={appearance.hairStyle}
            hairColor={appearance.hairColor}
            faceShape={appearance.faceShape}
            garmentStyle={appearance.garmentStyle}
            personalityPose={appearance.personalityPose}
            reactionGesture={isActive ? reactionGesture : null}
            gestureKey={sentenceIndex}
            isSpeaking={isActive && (isPlaying || Boolean(currentSentenceText))}
            idleMotion={!isActive || worldPreviewActive}
            previewSpeech={worldPreviewActive && isActive}
            showNameLabel={showCharacterLabels || isActive}
            characterType={char.type}
            characterName={char.name.trim() || meta.label}
          />
        );
      })}
      <Preload all />
      {enablePostFx && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.28}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          <Vignette offset={0.28} darkness={0.42} />
        </EffectComposer>
      )}
    </>
  );
}

export default function StoryCanvas({
  compact = false,
  worldPreview = false,
  showCharacterLabels = false,
  showDialogueHud,
}: {
  compact?: boolean;
  worldPreview?: boolean;
  showCharacterLabels?: boolean;
  showDialogueHud?: boolean;
}) {
  const hasDialogue = useImmersiveStore((s) =>
    Boolean(s.currentSentenceText.trim() || s.currentKinyarwandaText.trim())
  );
  const dialogueHudVisible = (showDialogueHud ?? !worldPreview) && hasDialogue;

  return (
    <div className={`${compact ? 'absolute inset-0' : 'absolute inset-0'} bg-[#1e1b18]`}>
      <Canvas
        shadows
        camera={{ position: [0, 1.55, compact ? 5 : 4.2], fov: compact ? 45 : 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <CameraRig compact={compact} worldPreview={worldPreview} />
          <SceneContents
            showCharacterLabels={showCharacterLabels}
            enablePostFx={!compact}
          />
        </Suspense>
      </Canvas>
      {dialogueHudVisible && <StoryDialogueHud compact={compact} />}
      {!worldPreview && <HotspotCard />}
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
