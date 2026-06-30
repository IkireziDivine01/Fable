'use client';

import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { CharacterType, DisplayLanguage } from '@/lib/immersive/types';
import StoryDialogueBubble from './StoryDialogueBubble';

interface StoryCharacterMeshProps {
  position: [number, number, number];
  skinColor: string;
  garmentColor: string;
  accentColor: string;
  height: number;
  mouthOpenness: number;
  isSpeaking: boolean;
  characterType: CharacterType;
  speechText?: string;
  kinyarwandaText?: string;
  characterName?: string;
  displayLanguage?: DisplayLanguage;
}

export default function StoryCharacterMesh({
  position,
  skinColor,
  garmentColor,
  accentColor,
  height,
  mouthOpenness,
  isSpeaking,
  characterType,
  speechText,
  kinyarwandaText,
  characterName,
  displayLanguage = 'en',
}: StoryCharacterMeshProps) {
  const groupRef = useRef<Group>(null);
  const isDog = characterType === 'dog';
  const isElder = characterType === 'grandma' || characterType === 'grandpa';

  useFrame(() => {
    if (!groupRef.current) return;
    const bob = isSpeaking ? Math.sin(Date.now() * 0.005) * 0.015 : 0;
    groupRef.current.position.y = position[1] + bob;
  });

  const headY = isDog ? height * 0.55 : height * 0.88;
  const mouthOpen = 0.03 + mouthOpenness * 0.2;
  const displayText =
    displayLanguage === 'rw' && kinyarwandaText?.trim()
      ? kinyarwandaText.trim()
      : speechText?.trim();

  if (isDog) {
    return (
      <group ref={groupRef} position={position}>
        <mesh position={[0, height * 0.25, 0]} castShadow>
          <capsuleGeometry args={[height * 0.22, height * 0.45, 8, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
        <mesh position={[0, headY, height * 0.12]} castShadow>
          <sphereGeometry args={[height * 0.22, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, headY - 0.04, height * 0.28]} scale={[0.1, mouthOpen * 3.5, 0.06]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#3d2914" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {/* Legs */}
      <mesh position={[-0.12, height * 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.07, height * 0.28, 6, 12]} />
        <meshStandardMaterial color={garmentColor} roughness={0.75} />
      </mesh>
      <mesh position={[0.12, height * 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.07, height * 0.28, 6, 12]} />
        <meshStandardMaterial color={garmentColor} roughness={0.75} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, height * 0.52, 0]} castShadow>
        <capsuleGeometry args={[height * 0.2, height * 0.32, 8, 16]} />
        <meshStandardMaterial color={garmentColor} roughness={0.7} />
      </mesh>

      {/* Traditional wrap / sash */}
      <mesh position={[0, height * 0.48, height * 0.12]}>
        <boxGeometry args={[height * 0.44, height * 0.1, 0.04]} />
        <meshStandardMaterial color={accentColor} roughness={0.55} />
      </mesh>

      {/* Arms */}
      <mesh position={[-height * 0.28, height * 0.52, 0.02]} rotation={[0, 0, 0.35]} castShadow>
        <capsuleGeometry args={[0.05, height * 0.22, 6, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.65} />
      </mesh>
      <mesh position={[height * 0.28, height * 0.52, 0.02]} rotation={[0, 0, -0.35]} castShadow>
        <capsuleGeometry args={[0.05, height * 0.22, 6, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.65} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, height * 0.72, 0.02]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Head */}
      <mesh position={[0, headY, 0.04]} castShadow>
        <sphereGeometry args={[height * 0.17, 20, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.55} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, headY + (isElder ? 0.02 : 0.06), -0.02]}>
        <sphereGeometry args={[height * 0.175, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={isElder ? '#4a3728' : '#1e1b18'} roughness={0.9} />
      </mesh>

      {/* Eyes */}
      {[-0.055, 0.055].map((x) => (
        <group key={x} position={[x, headY + 0.02, height * 0.14]}>
          <mesh>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#f5f0eb" />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#1e1b18" />
          </mesh>
        </group>
      ))}

      {/* Nose */}
      <mesh position={[0, headY - 0.02, height * 0.15]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Mouth — animates with lip-sync */}
      <mesh position={[0, headY - 0.07, height * 0.16]} scale={[0.08, mouthOpen * 3, 0.03]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#6b3a2a" roughness={0.4} />
      </mesh>

      {/* Speech bubble above character — Toy Story–style, inline styles for drei Html */}
      {isSpeaking && displayText && (
        <Html
          position={[0, headY + 0.62, 0.15]}
          center
          distanceFactor={14}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <StoryDialogueBubble characterName={characterName} text={displayText} />
        </Html>
      )}
    </group>
  );
}
